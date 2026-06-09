import Foundation
import CoreLocation

// Writes the device's current location to the shared App Group so widget
// extensions can read it without needing their own location permission.
//
// Usage: instantiate once and keep alive (e.g. in your @main App struct).
// The coordinate is persisted between launches, so the widget always has
// the last known position even when the app is not running.
final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {

    private let manager = CLLocationManager()
    // Must match kAppGroupID in SunriseSunsetProvider.swift
    private let groupDefaults = UserDefaults(suiteName: "group.com.yourapp.sunrisewidget")

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
        manager.distanceFilter = 5000 // update only when moved 5 km
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        groupDefaults?.set(loc.coordinate.latitude,  forKey: "lastLatitude")
        groupDefaults?.set(loc.coordinate.longitude, forKey: "lastLongitude")
        WidgetCenter.shared.reloadAllTimelines()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingLocation()
        }
    }
}
