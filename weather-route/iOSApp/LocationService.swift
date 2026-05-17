import CoreLocation

@MainActor
final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocationCoordinate2D, Error>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestOnce() async throws -> CLLocationCoordinate2D {
        try await withCheckedThrowingContinuation { cont in
            self.continuation = cont
            switch manager.authorizationStatus {
            case .notDetermined:
                manager.requestWhenInUseAuthorization()
            case .authorizedWhenInUse, .authorizedAlways:
                manager.requestLocation()
            case .denied, .restricted:
                fail(LocationError.denied)
            @unknown default:
                fail(LocationError.unknown)
            }
        }
    }

    private func fail(_ error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }

    private func succeed(_ coord: CLLocationCoordinate2D) {
        continuation?.resume(returning: coord)
        continuation = nil
    }

    nonisolated func locationManager(_ manager: CLLocationManager,
                                     didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.first else { return }
        Task { @MainActor in self.succeed(loc.coordinate) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager,
                                     didFailWithError error: Error) {
        Task { @MainActor in self.fail(error) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            switch status {
            case .authorizedWhenInUse, .authorizedAlways:
                if self.continuation != nil { manager.requestLocation() }
            case .denied, .restricted:
                self.fail(LocationError.denied)
            default:
                break
            }
        }
    }
}

enum LocationError: LocalizedError {
    case denied, unknown
    var errorDescription: String? {
        switch self {
        case .denied:  return "定位权限被拒绝，请在「设置 → RainAway → 位置」开启。"
        case .unknown: return "定位状态未知。"
        }
    }
}
