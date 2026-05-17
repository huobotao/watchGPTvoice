import SwiftUI

struct ContentView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        VStack(spacing: 12) {
            header
            CompassView(
                bearing: state.result?.best.direction.bearing,
                centerLabel: state.result?.best.direction.name ?? "--"
            )
            .frame(height: 220)
            .padding(.vertical, 4)

            adviceCard

            MapPanel(
                origin: state.origin,
                result: state.result,
                route: state.route
            )
            .frame(height: 240)
            .clipShape(RoundedRectangle(cornerRadius: 16))

            Spacer(minLength: 0)
            controls
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .task {
            if state.phase == .idle { await state.search() }
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("RainAway · 驱雨")
                    .font(.title2.bold())
                Text(locationText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.top, 4)
    }

    private var locationText: String {
        if let c = state.origin {
            return String(format: "当前 %.3f, %.3f", c.latitude, c.longitude)
        }
        return "等待定位…"
    }

    private var adviceCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(state.primaryAdvice)
                .font(.headline)
            if !state.secondaryAdvice.isEmpty {
                Text(state.secondaryAdvice)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(white: 0.08))
        )
    }

    private var controls: some View {
        HStack(spacing: 10) {
            Button {
                Task { await state.search() }
            } label: {
                Text(state.phase.buttonTitle)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.cyan)
                    .foregroundStyle(Color.black)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(state.phase.isBusy)
            .opacity(state.phase.isBusy ? 0.5 : 1)

            Button {
                let text = state.primaryAdvice + "。" + state.secondaryAdvice
                Speaker.shared.say(text)
            } label: {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.title3)
                    .frame(width: 52, height: 52)
                    .background(Color(white: 0.12))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(state.result == nil)
        }
    }
}
