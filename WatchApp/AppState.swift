import Foundation

@MainActor
final class AppState: ObservableObject {
    enum Route: Hashable { case record, reply }

    @Published var path: [Route] = []
    @Published var isRecording = false
    @Published var elapsed: Int = 0
    @Published var replyText: String = ""
    @Published var isThinking: Bool = false
    @Published var lastTranscript: String = ""
    @Published var errorMessage: String?

    func goHome() {
        path.removeAll()
        resetRecord()
    }

    func resetRecord() {
        isRecording = false
        elapsed = 0
    }
}
