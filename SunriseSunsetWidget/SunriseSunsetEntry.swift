import WidgetKit

struct SunriseSunsetEntry: TimelineEntry {
    let date: Date           // Widget refresh timestamp
    let events: [SolarEvent] // 8 events sorted chronologically
    let isPlaceholder: Bool

    static var placeholder: SunriseSunsetEntry {
        let now = Date()
        let placeholderTimes: [Double] = [-120, -60, -20, 30, 360, 390, 420, 460]
        let events = zip(SolarEventKind.allCases, placeholderTimes).map { kind, offset in
            SolarEvent(kind: kind, time: now.addingTimeInterval(offset * 60))
        }.sorted { $0.time < $1.time }
        return SunriseSunsetEntry(date: now, events: events, isPlaceholder: true)
    }
}
