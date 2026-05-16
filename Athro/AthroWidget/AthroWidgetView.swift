import WidgetKit
import SwiftUI

struct AthroWidgetView: View {
    let entry: FareEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .systemSmall:  SmallView(destination: best)
        case .systemMedium: MediumView(destination: best)
        case .systemLarge:  LargeView(destinations: entry.destinations)
        default:            SmallView(destination: best)
        }
    }

    private var best: Destination {
        entry.destinations.min { $0.bestDay.price < $1.bestDay.price } ?? entry.destinations[0]
    }
}

private struct SmallView: View {
    let destination: Destination
    var body: some View {
        let best = destination.bestDay
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "airplane")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.athroAccent)
                Text("SYD → \(destination.iata)")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.athroInk3)
            }
            Text("A$\(best.price)")
                .font(.system(size: 28, weight: .heavy, design: .rounded))
                .foregroundColor(.athroInk)
                .minimumScaleFactor(0.7)
            Text("\(best.md) 周\(best.dow)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.athroInk2)
            Spacer(minLength: 0)
            HStack(spacing: 3) {
                Image(systemName: "arrow.down.right")
                    .font(.system(size: 9, weight: .bold))
                Text("\(destination.avgDeltaPct)% vs 30日均")
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundColor(AthroTheme.dealGreen)
        }
    }
}

private struct MediumView: View {
    let destination: Destination
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "airplane")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.athroAccent)
                    Text("SYD → \(destination.iata) · \(destination.name)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.athroInk2)
                }
                Spacer()
                Text("\(destination.avgDeltaPct)%")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(AthroTheme.dealGreen)
            }
            HStack(alignment: .top, spacing: 6) {
                ForEach(Array(destination.days.enumerated()), id: \.element.id) { idx, day in
                    DayCell(day: day, isBest: idx == destination.bestIdx, compact: true)
                }
            }
        }
    }
}

private struct LargeView: View {
    let destinations: [Destination]
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: "airplane")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.athroAccent)
                Text("Athro · SYD 出发")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.athroInk)
                Spacer()
            }
            ForEach(destinations) { d in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(d.iata) · \(d.name)")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.athroInk2)
                        Spacer()
                        Text("最低 A$\(d.bestDay.price) · \(d.bestDay.md)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(AthroTheme.dealGreen)
                    }
                    HStack(spacing: 4) {
                        ForEach(Array(d.days.enumerated()), id: \.element.id) { idx, day in
                            DayCell(day: day, isBest: idx == d.bestIdx, compact: true)
                        }
                    }
                }
            }
        }
    }
}

private struct DayCell: View {
    let day: DayPrice
    let isBest: Bool
    var compact: Bool = false
    var body: some View {
        VStack(spacing: 2) {
            Text(day.dow)
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(.athroInk3)
            Text("A$\(day.price)")
                .font(.system(size: compact ? 9 : 11, weight: .heavy, design: .rounded))
                .foregroundColor(isBest ? AthroTheme.dealGreen : .athroInk)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text("\(day.hotel)")
                .font(.system(size: 7))
                .foregroundColor(.athroInk3)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 7)
                .fill(isBest ? AthroTheme.dealGreen.opacity(0.15) : Color.white.opacity(0.05))
        )
    }
}
