import Foundation
import SwiftUI

public enum PriceBand: String, Codable, Sendable {
    case deal, mid, high

    public var label: String {
        switch self {
        case .deal: return "特价"
        case .mid:  return "适中"
        case .high: return "偏贵"
        }
    }

    public var tint: Color {
        switch self {
        case .deal: return Color(red: 0.20, green: 0.78, blue: 0.43)
        case .mid:  return Color(red: 0.95, green: 0.74, blue: 0.18)
        case .high: return Color(red: 0.95, green: 0.36, blue: 0.36)
        }
    }
}

public struct DayPrice: Identifiable, Hashable, Codable, Sendable {
    public var id: String { md }
    public let md: String
    public let dow: String
    public let price: Int
    public let hotel: Int
    public let rating: Double
    public let band: PriceBand

    public init(md: String, dow: String, price: Int, hotel: Int, rating: Double, band: PriceBand) {
        self.md = md; self.dow = dow; self.price = price
        self.hotel = hotel; self.rating = rating; self.band = band
    }
}

public struct Destination: Identifiable, Hashable, Codable, Sendable {
    public var id: String { iata }
    public let iata: String
    public let name: String
    public let bestIdx: Int
    public let avgDeltaPct: Int
    public let weekAvgDeltaPct: Int
    public let days: [DayPrice]
    public let notifTitle: String
    public let notifText: String

    public var bestDay: DayPrice { days[bestIdx] }

    public init(iata: String, name: String, bestIdx: Int,
                avgDeltaPct: Int, weekAvgDeltaPct: Int,
                days: [DayPrice], notifTitle: String, notifText: String) {
        self.iata = iata; self.name = name; self.bestIdx = bestIdx
        self.avgDeltaPct = avgDeltaPct; self.weekAvgDeltaPct = weekAvgDeltaPct
        self.days = days; self.notifTitle = notifTitle; self.notifText = notifText
    }
}

public protocol FareProvider: Sendable {
    func destinations() -> [Destination]
    func destination(iata: String) -> Destination?
}
