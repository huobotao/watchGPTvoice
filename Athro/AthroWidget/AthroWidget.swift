import WidgetKit
import SwiftUI

struct FareEntry: TimelineEntry {
    let date: Date
    let destinations: [Destination]
}

struct FareProviderTL: TimelineProvider {
    private let fares: FareProvider = MockFareProvider()

    func placeholder(in context: Context) -> FareEntry {
        FareEntry(date: .now, destinations: fares.destinations())
    }

    func getSnapshot(in context: Context, completion: @escaping (FareEntry) -> Void) {
        completion(FareEntry(date: .now, destinations: fares.destinations()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FareEntry>) -> Void) {
        let entry = FareEntry(date: .now, destinations: fares.destinations())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct AthroFareWidget: Widget {
    let kind = "AthroFareWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FareProviderTL()) { entry in
            AthroWidgetView(entry: entry)
                .containerBackground(for: .widget) { AthroTheme.bg }
        }
        .configurationDisplayName("Athro 票价仪表盘")
        .description("锁定的目的地未来 7 天最低往返价 + 同期酒店均价。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
