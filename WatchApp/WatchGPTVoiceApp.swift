import SwiftUI

@main
struct WatchGPTVoiceApp: App {
    // Keeps location running while the app is open and writes to App Group
    // so the sunrise/sunset widget always has a fresh coordinate.
    @StateObject private var locationManager = LocationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(locationManager)
        }
    }
}
