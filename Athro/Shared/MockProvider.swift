import Foundation

public struct MockFareProvider: FareProvider {
    public init() {}

    public func destinations() -> [Destination] { Self.all }
    public func destination(iata: String) -> Destination? {
        Self.all.first { $0.iata == iata }
    }

    private static let akl = Destination(
        iata: "AKL", name: "奥克兰",
        bestIdx: 3, avgDeltaPct: -18, weekAvgDeltaPct: -4,
        days: [
            DayPrice(md: "5/9",  dow: "六", price: 612, hotel: 168, rating: 8.5, band: .high),
            DayPrice(md: "5/10", dow: "日", price: 589, hotel: 172, rating: 8.4, band: .mid),
            DayPrice(md: "5/11", dow: "一", price: 538, hotel: 155, rating: 8.6, band: .mid),
            DayPrice(md: "5/12", dow: "二", price: 489, hotel: 149, rating: 8.7, band: .deal),
            DayPrice(md: "5/13", dow: "三", price: 522, hotel: 158, rating: 8.6, band: .mid),
            DayPrice(md: "5/14", dow: "四", price: 567, hotel: 162, rating: 8.5, band: .mid),
            DayPrice(md: "5/15", dow: "五", price: 645, hotel: 178, rating: 8.4, band: .high)
        ],
        notifTitle: "悉尼 → 奥克兰 命中特价!",
        notifText:  "5 月 12 日往返 A$489 · 同期 4★ 酒店 A$149/晚 · 比近 30 日均价低 18%"
    )

    private static let chc = Destination(
        iata: "CHC", name: "基督城",
        bestIdx: 4, avgDeltaPct: -22, weekAvgDeltaPct: -6,
        days: [
            DayPrice(md: "5/9",  dow: "六", price: 725, hotel: 138, rating: 8.7, band: .high),
            DayPrice(md: "5/10", dow: "日", price: 688, hotel: 142, rating: 8.6, band: .high),
            DayPrice(md: "5/11", dow: "一", price: 602, hotel: 129, rating: 8.7, band: .mid),
            DayPrice(md: "5/12", dow: "二", price: 549, hotel: 132, rating: 8.7, band: .mid),
            DayPrice(md: "5/13", dow: "三", price: 498, hotel: 135, rating: 8.8, band: .deal),
            DayPrice(md: "5/14", dow: "四", price: 556, hotel: 144, rating: 8.6, band: .mid),
            DayPrice(md: "5/15", dow: "五", price: 639, hotel: 151, rating: 8.5, band: .high)
        ],
        notifTitle: "悉尼 → 基督城 命中特价!",
        notifText:  "5 月 13 日往返 A$498 · 同期 4★ 酒店 A$135/晚 · 比近 30 日均价低 22%"
    )

    private static let zqn = Destination(
        iata: "ZQN", name: "皇后镇",
        bestIdx: 5, avgDeltaPct: -11, weekAvgDeltaPct: -3,
        days: [
            DayPrice(md: "5/9",  dow: "六", price: 892, hotel: 215, rating: 8.9, band: .high),
            DayPrice(md: "5/10", dow: "日", price: 858, hotel: 208, rating: 8.9, band: .high),
            DayPrice(md: "5/11", dow: "一", price: 784, hotel: 189, rating: 8.8, band: .mid),
            DayPrice(md: "5/12", dow: "二", price: 739, hotel: 182, rating: 8.8, band: .mid),
            DayPrice(md: "5/13", dow: "三", price: 712, hotel: 178, rating: 8.8, band: .mid),
            DayPrice(md: "5/14", dow: "四", price: 679, hotel: 172, rating: 8.9, band: .deal),
            DayPrice(md: "5/15", dow: "五", price: 768, hotel: 195, rating: 8.7, band: .high)
        ],
        notifTitle: "悉尼 → 皇后镇 价位下探",
        notifText:  "5 月 14 日往返 A$679 · 同期 4★ 酒店 A$172/晚 · 比近 30 日均价低 11%"
    )

    public static let all: [Destination] = [akl, chc, zqn]
}
