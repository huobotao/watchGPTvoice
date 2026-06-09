import SwiftUI
import WidgetKit

// MARK: - Shared row

struct EventRow: View {
    let event: SolarEvent
    let isNext: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: event.kind.sfSymbol)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: 18)

            Text(event.kind.chineseName)
                .font(.system(size: 12, weight: isNext ? .bold : .regular))
                .foregroundStyle(isNext ? .primary : .secondary)
                .lineLimit(1)

            Spacer(minLength: 4)

            VStack(alignment: .trailing, spacing: 1) {
                Text(event.timeString)
                    .font(.system(size: 12, weight: isNext ? .bold : .regular).monospacedDigit())
                    .foregroundStyle(isNext ? .primary : .secondary)
                Text(event.deltaString)
                    .font(.system(size: 9))
                    .foregroundStyle(event.isPast ? Color.gray.opacity(0.6) : .orange)
            }
        }
        .padding(.vertical, 1)
        .opacity(event.isPast ? 0.5 : 1.0)
    }

    private var iconColor: Color {
        event.kind.isRising ? .yellow : .orange
    }
}

// MARK: - Small (next event only)

struct SmallWidgetView: View {
    let entry: SunriseSunsetEntry

    private var nextEvent: SolarEvent? {
        entry.events.first(where: { !$0.isPast }) ?? entry.events.first
    }

    var body: some View {
        if let ev = nextEvent {
            VStack(spacing: 4) {
                Image(systemName: ev.kind.sfSymbol)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(ev.kind.isRising ? .yellow : .orange)

                Text(ev.kind.chineseName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)

                Text(ev.timeString)
                    .font(.system(size: 20, weight: .bold).monospacedDigit())
                    .foregroundStyle(.primary)

                Text(ev.deltaString)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(.black.gradient, for: .widget)
        }
    }
}

// MARK: - Medium (4 upcoming events)

struct MediumWidgetView: View {
    let entry: SunriseSunsetEntry

    private var upcomingFour: [SolarEvent] {
        let future = entry.events.filter { !$0.isPast }
        return Array((future.isEmpty ? entry.events : future).prefix(4))
    }

    private func isNext(_ event: SolarEvent) -> Bool {
        upcomingFour.first?.id == event.id
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(upcomingFour) { ev in
                EventRow(event: ev, isNext: isNext(ev))
                if ev.id != upcomingFour.last?.id {
                    Divider().opacity(0.2)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .containerBackground(.black.gradient, for: .widget)
    }
}

// MARK: - Large (all 8 events)

struct LargeWidgetView: View {
    let entry: SunriseSunsetEntry

    private var nextEventID: UUID? {
        entry.events.first(where: { !$0.isPast })?.id
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Label("日出日落", systemImage: "sun.horizon.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.yellow)
                Spacer()
            }
            .padding(.bottom, 6)

            ForEach(entry.events) { ev in
                EventRow(event: ev, isNext: ev.id == nextEventID)
                if ev.id != entry.events.last?.id {
                    Divider().opacity(0.2)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .containerBackground(.black.gradient, for: .widget)
    }
}

// MARK: - Watch accessoryRectangular

struct AccessoryRectangularView: View {
    let entry: SunriseSunsetEntry

    private var displayEvents: [SolarEvent] {
        let future = entry.events.filter { !$0.isPast }
        return Array((future.isEmpty ? entry.events : future).prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(displayEvents) { ev in
                HStack(spacing: 4) {
                    Image(systemName: ev.kind.sfSymbol)
                        .font(.system(size: 10))
                    Text(ev.kind.chineseName)
                        .font(.system(size: 11))
                    Spacer()
                    Text(ev.timeString)
                        .font(.system(size: 11).monospacedDigit())
                    Text(ev.deltaString)
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .containerBackground(.black, for: .widget)
    }
}

// MARK: - Watch accessoryCircular

struct AccessoryCircularView: View {
    let entry: SunriseSunsetEntry

    private var nextEvent: SolarEvent? {
        entry.events.first(where: { !$0.isPast }) ?? entry.events.first
    }

    var body: some View {
        if let ev = nextEvent {
            VStack(spacing: 2) {
                Image(systemName: ev.kind.sfSymbol)
                    .font(.system(size: 14, weight: .semibold))
                Text(ev.timeString)
                    .font(.system(size: 11, weight: .bold).monospacedDigit())
                    .minimumScaleFactor(0.7)
            }
            .containerBackground(.black, for: .widget)
        }
    }
}

// MARK: - Watch accessoryInline

struct AccessoryInlineView: View {
    let entry: SunriseSunsetEntry

    private var nextEvent: SolarEvent? {
        entry.events.first(where: { !$0.isPast }) ?? entry.events.first
    }

    var body: some View {
        if let ev = nextEvent {
            Label("\(ev.kind.chineseName) \(ev.timeString) \(ev.deltaString)", systemImage: ev.kind.sfSymbol)
                .containerBackground(.clear, for: .widget)
        }
    }
}

// MARK: - Entry view dispatcher

struct SunriseSunsetWidgetEntryView: View {
    var entry: SunriseSunsetEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge, .systemExtraLarge:
            LargeWidgetView(entry: entry)
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}
