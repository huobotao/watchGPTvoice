import SwiftUI

struct ContentView: View {
    @StateObject private var quota = QuotaManager.shared
    @AppStorage("soundEnabled") private var soundEnabled = true

    @State private var pickedDate = Date.now.addingTimeInterval(5 * 3600)
    @State private var showDatePicker = false

    var body: some View {
        NavigationStack {
            List {
                statusSection
                if !quota.isActive {
                    manualSection
                }
                settingsSection
            }
            .navigationTitle("Claude 配额")
        }
        .onAppear {
            NotificationManager.shared.requestPermission { _ in }
        }
    }

    // MARK: - Sections

    private var statusSection: some View {
        Section {
            if quota.isActive, let reset = quota.resetDate {
                VStack(alignment: .leading, spacing: 6) {
                    Label("倒计时中", systemImage: "clock.fill")
                        .foregroundColor(.orange)
                        .font(.headline)
                    Text("重置时间：\(reset.formatted(date: .abbreviated, time: .shortened))")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(reset, style: .timer)
                        .font(.system(.largeTitle, design: .monospaced))
                        .bold()
                        .foregroundColor(.primary)
                }
                .padding(.vertical, 4)

                Button(role: .destructive) {
                    quota.cancel()
                } label: {
                    Label("取消倒计时", systemImage: "xmark.circle")
                }
            } else {
                Label("暂无倒计时", systemImage: "checkmark.circle")
                    .foregroundColor(.green)
            }
        } header: {
            Text("当前状态")
        }
    }

    private var manualSection: some View {
        Section {
            if showDatePicker {
                DatePicker("重置时间", selection: $pickedDate, in: Date.now..., displayedComponents: [.date, .hourAndMinute])
                    .datePickerStyle(.graphical)
            }
            Button {
                if showDatePicker {
                    quota.start(resetDate: pickedDate, soundEnabled: soundEnabled)
                    showDatePicker = false
                } else {
                    pickedDate = Date.now.addingTimeInterval(5 * 3600)
                    showDatePicker = true
                }
            } label: {
                Label(showDatePicker ? "确认开始倒计时" : "配额刚满，开始倒计时", systemImage: showDatePicker ? "checkmark" : "bolt.fill")
            }
            if showDatePicker {
                Button("取消") { showDatePicker = false }
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("手动触发")
        } footer: {
            Text("也可通过 Safari 扩展自动检测 claude.ai 的配额消息。")
                .font(.caption)
        }
    }

    private var settingsSection: some View {
        Section {
            Toggle(isOn: $soundEnabled) {
                Label("重置时响铃", systemImage: soundEnabled ? "bell.fill" : "bell.slash.fill")
            }
        } header: {
            Text("通知设置")
        } footer: {
            Text("关闭后重置通知仍会到达，但不发出声音。")
                .font(.caption)
        }
    }
}

#Preview {
    ContentView()
}
