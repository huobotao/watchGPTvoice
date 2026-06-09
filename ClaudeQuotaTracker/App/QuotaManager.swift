import Foundation
import Combine

// APP_GROUP_ID must match the App Group entitlement in Xcode for all three targets.
let APP_GROUP_ID = "group.com.yourname.claudequota"

@MainActor
final class QuotaManager: ObservableObject {
    static let shared = QuotaManager()

    @Published private(set) var resetDate: Date?
    @Published private(set) var isActive = false

    private init() {
        // Restore state after app relaunch
        if let saved = UserDefaults(suiteName: APP_GROUP_ID)?.object(forKey: "resetDate") as? Date,
           saved > .now {
            resetDate = saved
            isActive = true
        }
    }

    func start(resetDate: Date, soundEnabled: Bool) {
        self.resetDate = resetDate
        isActive = true

        UserDefaults(suiteName: APP_GROUP_ID)?.set(resetDate, forKey: "resetDate")

        LiveActivityManager.shared.start(resetDate: resetDate)
        NotificationManager.shared.schedule(at: resetDate, sound: soundEnabled)
    }

    func cancel() {
        resetDate = nil
        isActive = false

        UserDefaults(suiteName: APP_GROUP_ID)?.removeObject(forKey: "resetDate")

        LiveActivityManager.shared.end()
        NotificationManager.shared.cancel()
    }

    /// Called by Safari Extension handler when it auto-detects a reset time.
    func handleExtensionDetection() {
        guard let date = UserDefaults(suiteName: APP_GROUP_ID)?.object(forKey: "resetDate") as? Date,
              date > .now else { return }
        // If already tracking a closer reset time, ignore
        if let existing = resetDate, existing <= date { return }

        let soundEnabled = UserDefaults.standard.bool(forKey: "soundEnabled")
        start(resetDate: date, soundEnabled: soundEnabled)
    }
}
