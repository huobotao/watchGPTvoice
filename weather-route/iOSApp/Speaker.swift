import AVFoundation

final class Speaker {
    static let shared = Speaker()
    private let synth = AVSpeechSynthesizer()

    func say(_ text: String) {
        guard !text.isEmpty else { return }
        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: "zh-CN")
        u.rate = AVSpeechUtteranceDefaultSpeechRate
        synth.speak(u)
    }
}
