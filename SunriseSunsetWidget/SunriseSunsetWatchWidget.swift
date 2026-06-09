import WidgetKit
import SwiftUI

// watchOS Widget Extension entry point.
// Create a separate watchOS Widget Extension target in Xcode and add this file
// (plus all shared files: SolarCalculator, SolarEvent, SunriseSunsetEntry,
//  SunriseSunsetProvider, SunriseSunsetWidgetViews) to that target.
@main
struct SunriseSunsetWatchWidgetBundle: WidgetBundle {
    var body: some Widget {
        SunriseSunsetWatchWidget()
    }
}

struct SunriseSunsetWatchWidget: Widget {
    let kind = "SunriseSunsetWatchWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SunriseSunsetProvider()) { entry in
            SunriseSunsetWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("日出日落")
        .description("显示最近日出日落的 8 个时间节点")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline,
        ])
    }
}
