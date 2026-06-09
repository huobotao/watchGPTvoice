import SwiftUI
import UserNotifications

@main
struct ClaudeQuotaTrackerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // Allow banner + sound when app is foregrounded at exact reset moment
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    // Handle URL scheme from Safari Extension: claudequota://reset?time=<ISO8601>
    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        guard url.scheme == "claudequota",
              url.host == "reset",
              let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let timeParam = comps.queryItems?.first(where: { $0.name == "time" })?.value,
              let resetDate = ISO8601DateFormatter().date(from: timeParam),
              resetDate > .now else { return false }

        let sound = UserDefaults.standard.bool(forKey: "soundEnabled")
        Task { @MainActor in
            QuotaManager.shared.start(resetDate: resetDate, soundEnabled: sound)
        }
        return true
    }
}
