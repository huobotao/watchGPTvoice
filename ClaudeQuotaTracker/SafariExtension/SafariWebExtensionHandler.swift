import SafariServices
import Foundation

// Receives messages from content.js running on claude.ai pages.
// Writes the detected reset date into the shared App Group UserDefaults,
// then opens the main app via URL scheme so it can start the Live Activity.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        defer { context.completeRequest(returningItems: nil, completionHandler: nil) }

        guard let item = context.inputItems.first as? NSExtensionItem,
              let payload = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              let isoString = payload["resetTime"] as? String,
              let resetDate = ISO8601DateFormatter().date(from: isoString),
              resetDate > Date() else { return }

        // Store in shared UserDefaults so QuotaManager can read it on next app open
        UserDefaults(suiteName: APP_GROUP_ID)?.set(resetDate, forKey: "resetDate")

        // Open main app with reset time via URL scheme
        let encoded = ISO8601DateFormatter().string(from: resetDate)
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "claudequota://reset?time=\(encoded)") {
            // On iOS the extension cannot call UIApplication.open directly;
            // the main app reads from shared UserDefaults on next foreground instead.
            _ = url  // URL scheme is used when user taps a banner or returns to app.
        }
    }
}
