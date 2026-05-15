// AlertView.swift — top banner + sound effect. Mirrors core/alerter.py.

import SwiftUI
import AudioToolbox

struct TrackView: Identifiable {
    let detection: Detection
    let approach: ApproachState
    let flashing: FlashState
    var id: Int { detection.trackID }
}

final class AlertController: ObservableObject {
    @Published var bannerText: String?
    private var bannerExpire: CFTimeInterval = 0
    private var lastSoundT: [String: CFTimeInterval] = [:]
    private let cooldown: CFTimeInterval = 5

    func consume(tracks: [TrackView], time: CFTimeInterval) {
        for t in tracks {
            let isPolice = t.detection.className.lowercased().contains("police")
            guard isPolice else { continue }
            let kind: String
            let text: String
            switch (t.approach, t.flashing) {
            case (.approaching, .flashing):
                kind = "approaching_flashing"; text = "Police approaching with lights on!"
            case (_, .flashing):
                kind = "flashing"; text = "Police with lights on"
            case (.approaching, _):
                kind = "approaching"; text = "Police approaching"
            default:
                kind = "seen"; text = "Police nearby"
            }
            if (lastSoundT[kind] ?? 0) + cooldown < time {
                lastSoundT[kind] = time
                bannerText = text
                bannerExpire = time + 3
                playSound(high: kind != "seen")
            }
        }
        if time > bannerExpire { bannerText = nil }
    }

    private func playSound(high: Bool) {
        // System sound IDs: 1005 = "tweet", 1304 = alert. Replace with a bundled wav for branding.
        AudioServicesPlaySystemSound(high ? 1304 : 1057)
    }
}

struct AlertBanner: View {
    @ObservedObject var alerter: AlertController
    var body: some View {
        VStack {
            if let text = alerter.bannerText {
                Text(text)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.85))
            }
            Spacer()
        }
    }
}

struct DetectionOverlay: View {
    let tracks: [TrackView]
    var body: some View {
        GeometryReader { geo in
            ForEach(tracks) { t in
                let rect = CGRect(
                    x: t.detection.bbox.minX * geo.size.width,
                    y: (1 - t.detection.bbox.maxY) * geo.size.height,
                    width: t.detection.bbox.width * geo.size.width,
                    height: t.detection.bbox.height * geo.size.height
                )
                Rectangle()
                    .strokeBorder(color(for: t), lineWidth: 3)
                    .frame(width: rect.width, height: rect.height)
                    .position(x: rect.midX, y: rect.midY)
            }
        }
    }
    private func color(for t: TrackView) -> Color {
        if t.flashing == .flashing { return .red }
        if t.approach == .approaching { return .orange }
        return .green
    }
}
