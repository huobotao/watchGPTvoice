import Foundation
import CoreLocation

struct Direction: Hashable, Identifiable {
    let name: String
    let short: String
    let bearing: Double
    var id: String { short }

    static let all: [Direction] = [
        .init(name: "正北", short: "N",  bearing: 0),
        .init(name: "东北", short: "NE", bearing: 45),
        .init(name: "正东", short: "E",  bearing: 90),
        .init(name: "东南", short: "SE", bearing: 135),
        .init(name: "正南", short: "S",  bearing: 180),
        .init(name: "西南", short: "SW", bearing: 225),
        .init(name: "正西", short: "W",  bearing: 270),
        .init(name: "西北", short: "NW", bearing: 315),
    ]
}

struct SamplePoint: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let direction: Direction?
    let distanceKm: Double
    var precipPerHour: [Double] = []
}

struct DirectionInfo: Identifiable {
    var id: String { direction.short }
    let direction: Direction
    let samples: [SamplePoint]
    let escapeDistanceKm: Double?
    let escapePrecipAtArrival: Double?
}

struct EscapeResult {
    let origin: SamplePoint
    let byDirection: [DirectionInfo]
    let best: DirectionInfo

    var bestTarget: CLLocationCoordinate2D? {
        guard let km = best.escapeDistanceKm else { return nil }
        return GeoMath.destination(
            from: origin.coordinate,
            bearing: best.direction.bearing,
            distanceKm: km
        )
    }
}

struct PlannedRoute {
    let polyline: [CLLocationCoordinate2D]
    let distanceKm: Double
    let durationMin: Double
}

enum GeoMath {
    static let earthRadiusKm = 6371.0

    static func destination(from origin: CLLocationCoordinate2D,
                            bearing bearingDeg: Double,
                            distanceKm: Double) -> CLLocationCoordinate2D {
        let phi1 = origin.latitude * .pi / 180
        let lam1 = origin.longitude * .pi / 180
        let theta = bearingDeg * .pi / 180
        let delta = distanceKm / earthRadiusKm
        let phi2 = asin(sin(phi1) * cos(delta)
                        + cos(phi1) * sin(delta) * cos(theta))
        let lam2 = lam1 + atan2(sin(theta) * sin(delta) * cos(phi1),
                                cos(delta) - sin(phi1) * sin(phi2))
        return CLLocationCoordinate2D(
            latitude: phi2 * 180 / .pi,
            longitude: lam2 * 180 / .pi
        )
    }
}

enum Tuning {
    static let sampleDistancesKm: [Double] = [20, 50, 100]
    static let dryThresholdMM: Double = 0.1
    static let avgSpeedKMH: Double = 60
    static let forecastHours: Int = 6
}
