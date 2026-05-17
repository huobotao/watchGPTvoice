import SwiftUI
import MapKit

struct MapPanel: View {
    let origin: CLLocationCoordinate2D?
    let result: EscapeResult?
    let route: PlannedRoute?

    @State private var camera: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $camera) {
            if let o = origin {
                Marker("当前位置", systemImage: "car.fill", coordinate: o)
                    .tint(.blue)
            }
            if let target = result?.bestTarget {
                Marker("目标晴朗点", systemImage: "sun.max.fill",
                       coordinate: target)
                    .tint(.cyan)
            }
            if let route = route, route.polyline.count >= 2 {
                MapPolyline(coordinates: route.polyline)
                    .stroke(.cyan, lineWidth: 5)
            }
            if let result = result {
                ForEach(result.byDirection) { info in
                    ForEach(info.samples) { sample in
                        Annotation("", coordinate: sample.coordinate) {
                            Circle()
                                .fill(color(sample.precipPerHour.first ?? 0))
                                .frame(width: 12, height: 12)
                                .overlay(Circle().stroke(.white.opacity(0.6),
                                                         lineWidth: 1))
                        }
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .flat))
        .onChange(of: focusRegionKey) { _, _ in updateCamera() }
        .onAppear { updateCamera() }
    }

    private var focusRegionKey: String {
        let o = origin.map { "\($0.latitude),\($0.longitude)" } ?? "none"
        let t = result?.bestTarget.map { "\($0.latitude),\($0.longitude)" } ?? "none"
        return o + "|" + t
    }

    private func updateCamera() {
        if let o = origin, let t = result?.bestTarget {
            let minLat = min(o.latitude, t.latitude)
            let maxLat = max(o.latitude, t.latitude)
            let minLon = min(o.longitude, t.longitude)
            let maxLon = max(o.longitude, t.longitude)
            let center = CLLocationCoordinate2D(
                latitude: (minLat + maxLat) / 2,
                longitude: (minLon + maxLon) / 2
            )
            let span = MKCoordinateSpan(
                latitudeDelta: max(0.5, (maxLat - minLat) * 1.6),
                longitudeDelta: max(0.5, (maxLon - minLon) * 1.6)
            )
            camera = .region(MKCoordinateRegion(center: center, span: span))
        } else if let o = origin {
            camera = .region(MKCoordinateRegion(
                center: o,
                latitudinalMeters: 200_000,
                longitudinalMeters: 200_000
            ))
        }
    }

    private func color(_ mm: Double) -> Color {
        if mm < 0.1 { return .green }
        if mm < 1   { return .yellow }
        if mm < 5   { return .orange }
        return .red
    }
}
