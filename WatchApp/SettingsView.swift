import SwiftUI

struct SettingsView: View {
    @AppStorage(Config.keyDefaultsKey) private var savedKey: String = ""
    @State private var draft: String = ""
    @State private var savedFlash = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("OpenAI API Key")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)

                TextField("sk-...", text: $draft)
                    .font(.system(size: 10, design: .monospaced))
                    .submitLabel(.done)

                HStack {
                    Button {
                        savedKey = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                        savedFlash = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                            savedFlash = false
                        }
                    } label: {
                        Text(savedFlash ? "已保存 ✓" : "保存")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                }

                if !savedKey.isEmpty {
                    Text("当前 Key: \(maskedKey)")
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)

                    Button {
                        savedKey = ""
                        draft = ""
                    } label: {
                        Text("清除")
                            .font(.system(size: 11))
                    }
                    .tint(.red)
                }

                Divider().padding(.vertical, 4)

                Text("说明")
                    .font(.system(size: 11, weight: .semibold))
                Text("在手表上手动输入完整 Key 很慢。建议用 Apple 听写/Scribble,或在 Xcode 里编辑 Config.swift 的 compiledInDefaultKey 字段烧进去。")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .navigationTitle("设置")
        .onAppear { draft = savedKey }
    }

    private var maskedKey: String {
        guard savedKey.count > 12 else { return "****" }
        let prefix = savedKey.prefix(7)
        let suffix = savedKey.suffix(4)
        return "\(prefix)…\(suffix)"
    }
}
