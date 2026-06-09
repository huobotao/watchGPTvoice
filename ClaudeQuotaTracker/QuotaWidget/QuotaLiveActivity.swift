import ActivityKit
import SwiftUI
import WidgetKit

// QuotaAttributes is defined in Shared/QuotaAttributes.swift and added to both targets.

struct QuotaLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: QuotaAttributes.self) { context in
            // Lock screen / notification banner view
            LockScreenView(state: context.state)
                .activityBackgroundTint(.black.opacity(0.85))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    ExpandedView(state: context.state)
                }
            } compactLeading: {
                Image(systemName: "clock.badge.exclamationmark")
                    .foregroundColor(.orange)
            } compactTrailing: {
                // System timer text — counts down automatically, zero CPU cost.
                Text(timerInterval: Date.now...context.state.resetDate, countsDown: true)
                    .monospacedDigit()
                    .font(.caption2)
                    .foregroundColor(.orange)
                    .frame(maxWidth: 60)
            } minimal: {
                Image(systemName: "bolt.fill")
                    .foregroundColor(.orange)
            }
        }
    }
}

// MARK: - Lock screen view

private struct LockScreenView: View {
    let state: QuotaAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "clock.badge.exclamationmark")
                .font(.title2)
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 2) {
                Text("Claude 配额倒计时")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(timerInterval: Date.now...state.resetDate, countsDown: true)
                    .monospacedDigit()
                    .font(.title3.bold())
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("重置于")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(state.resetDate, style: .time)
                    .font(.caption.bold())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

// MARK: - Expanded Dynamic Island view

private struct ExpandedView: View {
    let state: QuotaAttributes.ContentState

    var body: some View {
        VStack(spacing: 4) {
            Text("Claude 配额重置倒计时")
                .font(.caption)
                .foregroundColor(.secondary)

            Text(timerInterval: Date.now...state.resetDate, countsDown: true)
                .monospacedDigit()
                .font(.system(.title, design: .rounded).bold())
                .foregroundColor(.orange)

            Text("重置时间：\(state.resetDate.formatted(date: .omitted, time: .shortened))")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 6)
    }
}
