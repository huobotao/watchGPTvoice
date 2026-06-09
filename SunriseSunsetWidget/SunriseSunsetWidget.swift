import WidgetKit
import SwiftUI

// iOS Widget Extension entry point.
// Add this file (and all other files in this folder) to your iOS Widget Extension target.
@main
struct SunriseSunsetWidgetBundle: WidgetBundle {
    var body: some Widget {
        SunriseSunsetWidget()
    }
}

struct SunriseSunsetWidget: Widget {
    let kind = "SunriseSunsetWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SunriseSunsetProvider()) { entry in
            SunriseSunsetWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("日出日落")
        .description("显示当前位置最近日出和日落的 8 个时间节点")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
        ])
    }
}
