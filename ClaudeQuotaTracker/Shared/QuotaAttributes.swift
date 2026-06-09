import ActivityKit
import Foundation

// Shared between the main app target and QuotaWidget extension target.
// Both targets must be in the same App Group to share this type.
struct QuotaAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var resetDate: Date
    }

    var startedAt: Date
}
