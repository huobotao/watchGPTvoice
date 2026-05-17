import Foundation
import CoreLocation

struct WeatherService {

    private struct OpenMeteoResponse: Decodable {
        let hourly: Hourly
        struct Hourly: Decodable {
            let precipitation: [Double]
        }
    }

    func findEscape(from origin: CLLocationCoordinate2D) async throws -> EscapeResult {
        var points: [SamplePoint] = [
            SamplePoint(coordinate: origin, direction: nil, distanceKm: 0)
        ]
        for dir in Direction.all {
            for km in Tuning.sampleDistancesKm {
                let coord = GeoMath.destination(
                    from: origin, bearing: dir.bearing, distanceKm: km)
                points.append(SamplePoint(
                    coordinate: coord, direction: dir, distanceKm: km))
            }
        }

        let lats = points.map { String(format: "%.4f", $0.coordinate.latitude) }
            .joined(separator: ",")
        let lons = points.map { String(format: "%.4f", $0.coordinate.longitude) }
            .joined(separator: ",")

        var comps = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        comps.queryItems = [
            URLQueryItem(name: "latitude", value: lats),
            URLQueryItem(name: "longitude", value: lons),
            URLQueryItem(name: "hourly", value: "precipitation"),
            URLQueryItem(name: "forecast_hours", value: "\(Tuning.forecastHours)"),
            URLQueryItem(name: "timezone", value: "auto"),
        ]
        guard let url = comps.url else { throw WeatherError.badURL }

        let (data, response) = try await URLSession.shared.data(from: url)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw WeatherError.server(http.statusCode)
        }

        let series = try decode(data)
        guard series.count == points.count else {
            throw WeatherError.shape
        }

        var enriched = points
        for i in 0..<enriched.count {
            enriched[i].precipPerHour = series[i]
        }

        let infos: [DirectionInfo] = Direction.all.map { dir in
            let samples = enriched
                .filter { $0.direction?.short == dir.short }
                .sorted { $0.distanceKm < $1.distanceKm }
            var escape: Double? = nil
            var escapePrecip: Double? = nil
            for s in samples {
                let etaH = s.distanceKm / Tuning.avgSpeedKMH
                let idx = min(Int(etaH.rounded()), s.precipPerHour.count - 1)
                let p = idx >= 0 ? s.precipPerHour[idx] : 0
                if p <= Tuning.dryThresholdMM {
                    escape = s.distanceKm
                    escapePrecip = p
                    break
                }
            }
            return DirectionInfo(
                direction: dir,
                samples: samples,
                escapeDistanceKm: escape,
                escapePrecipAtArrival: escapePrecip
            )
        }

        let best = infos.min { a, b in
            let ka = a.escapeDistanceKm ?? .infinity
            let kb = b.escapeDistanceKm ?? .infinity
            if ka != kb { return ka < kb }
            return (a.escapePrecipAtArrival ?? 0) < (b.escapePrecipAtArrival ?? 0)
        }!

        return EscapeResult(
            origin: enriched[0],
            byDirection: infos,
            best: best
        )
    }

    private func decode(_ data: Data) throws -> [[Double]] {
        let decoder = JSONDecoder()
        if let arr = try? decoder.decode([OpenMeteoResponse].self, from: data) {
            return arr.map { $0.hourly.precipitation }
        }
        let single = try decoder.decode(OpenMeteoResponse.self, from: data)
        return [single.hourly.precipitation]
    }
}

enum WeatherError: LocalizedError {
    case badURL
    case server(Int)
    case shape

    var errorDescription: String? {
        switch self {
        case .badURL:        return "URL 构造失败"
        case .server(let c): return "天气服务返回错误 (\(c))"
        case .shape:         return "天气服务返回数据格式异常"
        }
    }
}
