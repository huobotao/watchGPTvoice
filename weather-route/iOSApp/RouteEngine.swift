import Foundation
import MapKit

struct RouteEngine {

    func driving(from: CLLocationCoordinate2D,
                 to: CLLocationCoordinate2D) async throws -> PlannedRoute {
        let req = MKDirections.Request()
        req.source = MKMapItem(placemark: MKPlacemark(coordinate: from))
        req.destination = MKMapItem(placemark: MKPlacemark(coordinate: to))
        req.transportType = .automobile

        let response = try await MKDirections(request: req).calculate()
        guard let route = response.routes.first else {
            throw RouteError.noRoute
        }

        let poly = route.polyline
        var coords = [CLLocationCoordinate2D](
            repeating: kCLLocationCoordinate2DInvalid,
            count: poly.pointCount
        )
        poly.getCoordinates(&coords, range: NSRange(location: 0, length: poly.pointCount))

        return PlannedRoute(
            polyline: coords,
            distanceKm: route.distance / 1000,
            durationMin: route.expectedTravelTime / 60
        )
    }
}

enum RouteError: LocalizedError {
    case noRoute
    var errorDescription: String? { "未能规划出可行驶路线。" }
}
