import Foundation

enum SolarEventKind: Int, CaseIterable, Identifiable {
    case astronomicalDawn
    case nauticalDawn
    case civilDawn
    case sunrise
    case sunset
    case civilDusk
    case nauticalDusk
    case astronomicalDusk

    var id: Int { rawValue }

    var chineseName: String {
        switch self {
        case .astronomicalDawn: return "天文曙光"
        case .nauticalDawn:     return "航海曙光"
        case .civilDawn:        return "民用曙光"
        case .sunrise:          return "日出"
        case .sunset:           return "日落"
        case .civilDusk:        return "民用暮光"
        case .nauticalDusk:     return "航海暮光"
        case .astronomicalDusk: return "天文暮光"
        }
    }

    var sfSymbol: String {
        switch self {
        case .astronomicalDawn: return "moon.stars.fill"
        case .nauticalDawn:     return "star.fill"
        case .civilDawn:        return "moon.haze.fill"
        case .sunrise:          return "sunrise.fill"
        case .sunset:           return "sunset.fill"
        case .civilDusk:        return "moon.haze"
        case .nauticalDusk:     return "star"
        case .astronomicalDusk: return "moon.stars"
        }
    }

    var isRising: Bool { rawValue < 4 }
}

struct SolarEvent: Identifiable {
    let id = UUID()
    let kind: SolarEventKind
    let time: Date

    var isPast: Bool { time < Date() }

    /// Signed minutes from now (negative = past)
    var minutesFromNow: Int {
        Int(time.timeIntervalSinceNow / 60)
    }

    /// Human-readable delta string, e.g. "还有 2h 15m" or "已过 45m"
    var deltaString: String {
        let total = abs(minutesFromNow)
        let h = total / 60
        let m = total % 60
        let prefix = isPast ? "已过" : "还有"
        if h > 0 {
            return "\(prefix) \(h)h \(m)m"
        } else {
            return "\(prefix) \(m)m"
        }
    }

    var timeString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "HH:mm"
        return fmt.string(from: time)
    }
}
