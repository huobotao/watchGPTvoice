import WidgetKit
import CoreLocation

// App Group ID — must match the one configured in Xcode Signing & Capabilities.
// Update this constant to your actual App Group identifier.
let kAppGroupID = "group.com.yourapp.sunrisewidget"

// UserDefaults keys written by the main app's LocationManager
let kLatitudeKey  = "lastLatitude"
let kLongitudeKey = "lastLongitude"

// Fallback location used before the main app writes a real coordinate.
private let fallbackLatitude  = 39.9042   // Beijing
private let fallbackLongitude = 116.4074

struct SunriseSunsetProvider: TimelineProvider {

    func placeholder(in context: Context) -> SunriseSunsetEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (SunriseSunsetEntry) -> Void) {
        completion(makeEntry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SunriseSunsetEntry>) -> Void) {
        let now = Date()
        let entry = makeEntry(for: now)

        // Refresh at the next upcoming solar event, or in 1 hour if all passed.
        let nextRefresh = entry.events.first(where: { !$0.isPast })?.time
            ?? now.addingTimeInterval(3600)

        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    // MARK: - Helpers

    private func loadCoordinate() -> CLLocationCoordinate2D {
        if let defaults = UserDefaults(suiteName: kAppGroupID),
           let lat = defaults.object(forKey: kLatitudeKey) as? Double,
           let lon = defaults.object(forKey: kLongitudeKey) as? Double {
            return CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }
        return CLLocationCoordinate2D(latitude: fallbackLatitude, longitude: fallbackLongitude)
    }

    private func makeEntry(for date: Date) -> SunriseSunsetEntry {
        let coord = loadCoordinate()
        let events = SolarCalculator.nextEightEvents(
            latitude: coord.latitude,
            longitude: coord.longitude,
            from: date
        )
        return SunriseSunsetEntry(date: date, events: events, isPlaceholder: false)
    }
}
