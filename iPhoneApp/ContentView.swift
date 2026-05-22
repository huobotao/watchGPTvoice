import SwiftUI
import Charts

struct ContentView: View {
    @EnvironmentObject var store: SampleStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HeaderCard()
                    ChartCard()
                    WindowPicker()
                    LegendNote()
                }
                .padding()
            }
            .navigationTitle("充电监测")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(role: .destructive) { store.clear() } label: {
                        Image(systemName: "trash")
                    }
                }
            }
        }
    }
}

private struct HeaderCard: View {
    @EnvironmentObject var store: SampleStore

    var body: some View {
        let latest = store.samples.last
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(latest?.isCharging == true ? "充电中" : "未充电",
                      systemImage: latest?.isCharging == true ? "bolt.fill" : "bolt.slash")
                    .foregroundStyle(latest?.isCharging == true ? .green : .secondary)
                Spacer()
                Text(String(format: "%.0f%%", (latest?.batteryLevel ?? 0) * 100))
                    .font(.title2.monospacedDigit())
            }
            HStack {
                metric("功率", value: String(format: "%.1f W", latest?.estimatedPowerW ?? 0))
                metric("温度", value: latest?.temperatureC.map { String(format: "%.1f°C", $0) } ?? "—")
                metric("电压", value: latest?.voltageV.map { String(format: "%.2f V", $0) } ?? "—")
                metric("电流", value: latest?.currentA.map { String(format: "%.2f A", $0) } ?? "—")
            }
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func metric(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.callout.monospacedDigit())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ChartCard: View {
    @EnvironmentObject var store: SampleStore

    var body: some View {
        let data = store.windowed
        Chart {
            ForEach(data) { s in
                LineMark(x: .value("时间", s.time),
                         y: .value("电量%", s.batteryLevel * 100))
                    .foregroundStyle(by: .value("series", "电量 %"))
            }
            ForEach(data) { s in
                LineMark(x: .value("时间", s.time),
                         y: .value("功率 W", s.estimatedPowerW))
                    .foregroundStyle(by: .value("series", "功率 W"))
            }
            ForEach(data.compactMap { s -> (Date, Double)? in
                s.temperatureC.map { (s.time, $0) }
            }, id: \.0) { item in
                LineMark(x: .value("时间", item.0),
                         y: .value("温度 °C", item.1))
                    .foregroundStyle(by: .value("series", "温度 °C"))
            }
        }
        .chartForegroundStyleScale([
            "电量 %": .blue,
            "功率 W": .orange,
            "温度 °C": .red,
        ])
        .chartLegend(position: .bottom)
        .frame(height: 280)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

private struct WindowPicker: View {
    @EnvironmentObject var store: SampleStore
    var body: some View {
        Picker("窗口", selection: $store.windowMinutes) {
            Text("15 分").tag(15)
            Text("30 分").tag(30)
            Text("1 时").tag(60)
            Text("3 时").tag(180)
            Text("24 时").tag(1440)
        }
        .pickerStyle(.segmented)
    }
}

private struct LegendNote: View {
    var body: some View {
        Text("公开 API 下电量分辨率 5%,功率为差分估算;温度/电压/电流需要私有 IOKit,见 PowerSampler.swift。")
            .font(.footnote)
            .foregroundStyle(.secondary)
    }
}
