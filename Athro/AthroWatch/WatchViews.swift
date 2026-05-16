import SwiftUI

struct WatchRootView: View {
    private let provider: FareProvider = MockFareProvider()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(provider.destinations()) { d in
                        NavigationLink {
                            WatchDestinationView(destination: d)
                        } label: {
                            WatchDestinationRow(destination: d)
                        }
                    }
                } header: {
                    Text("SYD 出发 · 7 日最低")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.athroInk3)
                }
            }
            .listStyle(.carousel)
            .navigationTitle("Athro")
        }
    }
}

struct WatchDestinationRow: View {
    let destination: Destination
    var body: some View {
        let b = destination.bestDay
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("\(destination.iata) · \(destination.name)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.athroInk)
                Spacer()
                Text("\(destination.avgDeltaPct)%")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(AthroTheme.dealGreen)
            }
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("A$\(b.price)")
                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                    .foregroundColor(AthroTheme.dealGreen)
                Text("· \(b.md) 周\(b.dow)")
                    .font(.system(size: 11))
                    .foregroundColor(.athroInk2)
            }
        }
        .padding(.vertical, 2)
    }
}

struct WatchDestinationView: View {
    let destination: Destination

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                ForEach(Array(destination.days.enumerated()), id: \.element.id) { idx, day in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(day.md)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.athroInk)
                            Text("周\(day.dow)")
                                .font(.system(size: 9))
                                .foregroundColor(.athroInk3)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 1) {
                            Text("A$\(day.price)")
                                .font(.system(size: 14, weight: .heavy, design: .rounded))
                                .foregroundColor(idx == destination.bestIdx ? AthroTheme.dealGreen : .athroInk)
                            Text("酒店 A$\(day.hotel)")
                                .font(.system(size: 9))
                                .foregroundColor(.athroInk3)
                        }
                    }
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(idx == destination.bestIdx
                                  ? AthroTheme.dealGreen.opacity(0.15)
                                  : Color.white.opacity(0.05))
                    )
                }
            }
        }
        .navigationTitle("\(destination.iata)")
    }
}
