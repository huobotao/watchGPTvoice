import SwiftUI

@main
struct ChargePowerApp: App {
    @StateObject private var store = SampleStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .onAppear { store.start() }
        }
    }
}
