import SwiftUI

struct DashboardView: View {
    private let provider: FareProvider = MockFareProvider()
    @State private var selectedIATA: String = "AKL"

    private var destinations: [Destination] { provider.destinations() }
    private var current: Destination {
        provider.destination(iata: selectedIATA) ?? destinations[0]
    }

    var body: some View {
        ZStack {
            AthroTheme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 14) {
                    header
                    summaryCard
                    daysCard
                    notifPreview
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 30)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            HStack(spacing: 8) {
                Circle()
                    .fill(AthroTheme.accent)
                    .frame(width: 22, height: 22)
                    .overlay(
                        Image(systemName: "airplane")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .rotationEffect(.degrees(-30))
                    )
                Text("Athro")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.athroInk)
            }
            Spacer()
            HStack(spacing: 6) {
                Text("SYD →")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.athroInk3)
                ForEach(destinations) { d in
                    Button {
                        withAnimation(.easeOut(duration: 0.18)) { selectedIATA = d.iata }
                    } label: {
                        Text(d.iata)
                            .font(.system(size: 12, weight: .bold))
                            .padding(.horizontal, 8).padding(.vertical, 5)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(selectedIATA == d.iata ? AthroTheme.accent : .clear)
                            )
                            .foregroundColor(selectedIATA == d.iata ? .white : .athroInk2)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(4)
            .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.06)))
        }
        .padding(.vertical, 6)
    }

    // MARK: - Summary

    private var summaryCard: some View {
        let d = current
        let best = d.bestDay
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(d.name) · \(d.iata)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.athroInk3)
                    Text("最低往返")
                        .font(.system(size: 11))
                        .foregroundColor(.athroInk3)
                    Text("A$\(best.price)")
                        .font(.system(size: 34, weight: .heavy, design: .rounded))
                        .foregroundColor(.athroInk)
                    Text("\(best.md) 周\(best.dow) 出发 · 4★ 酒店 A$\(best.hotel)/晚")
                        .font(.system(size: 11))
                        .foregroundColor(.athroInk2)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    deltaBadge(value: d.avgDeltaPct, caption: "vs 30日均价")
                    deltaBadge(value: d.weekAvgDeltaPct, caption: "vs 7日均价")
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(AthroTheme.panel)
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private func deltaBadge(value: Int, caption: String) -> some View {
        let isDown = value < 0
        return VStack(alignment: .trailing, spacing: 2) {
            HStack(spacing: 3) {
                Image(systemName: isDown ? "arrow.down.right" : "arrow.up.right")
                    .font(.system(size: 10, weight: .bold))
                Text("\(value)%")
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundColor(isDown ? AthroTheme.dealGreen : Color.red.opacity(0.8))
            Text(caption)
                .font(.system(size: 9))
                .foregroundColor(.athroInk3)
        }
    }

    // MARK: - 7-day grid

    private var daysCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("近 7 日仪表盘")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.athroInk)
                Spacer()
                Text("机票 · 4★ 酒店")
                    .font(.system(size: 11))
                    .foregroundColor(.athroInk3)
            }
            ForEach(Array(current.days.enumerated()), id: \.element.id) { idx, day in
                dayRow(day: day, isBest: idx == current.bestIdx)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(AthroTheme.panel)
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private func dayRow(day: DayPrice, isBest: Bool) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
                Text(day.md)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.athroInk)
                Text("周\(day.dow)")
                    .font(.system(size: 10))
                    .foregroundColor(.athroInk3)
            }
            .frame(width: 44, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                Text("A$\(day.price)")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundColor(isBest ? AthroTheme.dealGreen : .athroInk)
                Text("酒店 A$\(day.hotel) · \(String(format: "%.1f", day.rating))★")
                    .font(.system(size: 10))
                    .foregroundColor(.athroInk3)
            }

            Spacer()

            Text(day.band.label)
                .font(.system(size: 10, weight: .bold))
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(
                    Capsule().fill(day.band.tint.opacity(0.18))
                )
                .foregroundColor(day.band.tint)
        }
        .padding(.vertical, 8).padding(.horizontal, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(isBest ? AthroTheme.dealGreen.opacity(0.10) : Color.white.opacity(0.025))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(isBest ? AthroTheme.dealGreen.opacity(0.55) : .clear, lineWidth: 1)
                )
        )
    }

    // MARK: - Notification preview

    private var notifPreview: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(AthroTheme.accent)
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: 30, height: 30)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text("Athro")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.athroInk)
                    Spacer()
                    Text("刚刚")
                        .font(.system(size: 10))
                        .foregroundColor(.athroInk3)
                }
                Text(current.notifTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.athroInk)
                Text(current.notifText)
                    .font(.system(size: 11))
                    .foregroundColor(.athroInk2)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }
}

#Preview {
    DashboardView()
}
