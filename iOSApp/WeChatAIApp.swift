import SwiftUI

@main
struct WeChatAIApp: App {
    @StateObject private var store = ContactStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
        }
    }
}
