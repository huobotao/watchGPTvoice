import SwiftUI

struct ContentView: View {
    @StateObject private var state = AppState()

    var body: some View {
        NavigationStack(path: $state.path) {
            HomeView()
                .navigationDestination(for: AppState.Route.self) { route in
                    switch route {
                    case .record:   RecordView()
                    case .reply:    ReplyView()
                    case .settings: SettingsView()
                    }
                }
        }
        .environmentObject(state)
        .tint(.green)
    }
}
