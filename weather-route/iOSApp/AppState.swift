import Foundation
import CoreLocation

@MainActor
final class AppState: ObservableObject {

    enum Phase: Equatable {
        case idle
        case locating
        case fetchingWeather
        case fetchingRoute
        case done
        case failed(String)

        var isBusy: Bool {
            switch self {
            case .locating, .fetchingWeather, .fetchingRoute: return true
            default: return false
            }
        }

        var buttonTitle: String {
            switch self {
            case .idle:            return "查询脱雨方向"
            case .locating:        return "正在定位…"
            case .fetchingWeather: return "正在分析天气…"
            case .fetchingRoute:   return "正在规划路线…"
            case .done:            return "重新查询"
            case .failed:          return "重试"
            }
        }
    }

    @Published var phase: Phase = .idle
    @Published var origin: CLLocationCoordinate2D?
    @Published var result: EscapeResult?
    @Published var route: PlannedRoute?

    private let location = LocationService()
    private let weather  = WeatherService()
    private let router   = RouteEngine()

    func search() async {
        phase = .locating
        route = nil
        do {
            let coord = try await location.requestOnce()
            origin = coord

            phase = .fetchingWeather
            let r = try await weather.findEscape(from: coord)
            result = r

            if let target = r.bestTarget {
                phase = .fetchingRoute
                route = try? await router.driving(from: coord, to: target)
            }
            phase = .done
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    var primaryAdvice: String {
        guard let r = result, let origin = result?.origin else {
            switch phase {
            case .failed(let m): return "出错：\(m)"
            case .idle:          return "点击下方按钮查询"
            default:             return "正在分析…"
            }
        }
        let originPrecip = origin.precipPerHour.first ?? 0
        let originDry = originPrecip <= Tuning.dryThresholdMM
        if originDry && r.best.escapeDistanceKm == 0 {
            return "你脚下是晴天，附近也基本无雨"
        }
        guard let km = r.best.escapeDistanceKm else {
            return "周边各方向 100 公里内都有雨"
        }
        return "往 \(r.best.direction.name) 方向开约 \(Int(km)) 公里"
    }

    var secondaryAdvice: String {
        guard let r = result, let origin = result?.origin else { return "" }
        let originPrecip = origin.precipPerHour.first ?? 0
        let originDry = originPrecip <= Tuning.dryThresholdMM
        if originDry && r.best.escapeDistanceKm == 0 {
            return "未来几小时该位置都没问题"
        }
        guard let km = r.best.escapeDistanceKm else {
            return "建议就地停车避雨或休息，30-60 分钟后再试。"
        }
        let minutes = Int((km / Tuning.avgSpeedKMH * 60).rounded())
        var s = "按 60 km/h 估算 \(minutes) 分钟脱离雨区"
        s += String(format: "（当前头顶 %.1f mm/h）", originPrecip)
        if let route = route {
            s += " · 实际行车 \(Int(route.distanceKm)) km / \(Int(route.durationMin)) 分钟"
        }
        return s
    }
}
