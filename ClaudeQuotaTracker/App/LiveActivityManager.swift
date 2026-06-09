import ActivityKit
import Foundation

final class LiveActivityManager {
    static let shared = LiveActivityManager()
    private init() {}

    private var activity: Activity<QuotaAttributes>?

    func start(resetDate: Date) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let attrs = QuotaAttributes(startedAt: .now)
        let state = QuotaAttributes.ContentState(resetDate: resetDate)
        let content = ActivityContent(state: state, staleDate: resetDate)

        do {
            activity = try Activity.request(attributes: attrs, content: content, pushType: nil)
        } catch {
            print("LiveActivity start failed: \(error)")
        }
    }

    func end() {
        Task {
            await activity?.end(nil, dismissalPolicy: .immediate)
            activity = nil
        }
    }

    var isActive: Bool { activity != nil }
}
