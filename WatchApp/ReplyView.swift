import SwiftUI

struct ReplyView: View {
    @EnvironmentObject var state: AppState

    private let brand = Color(red: 0.06, green: 0.64, blue: 0.49)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                if !state.lastTranscript.isEmpty {
                    Text(state.lastTranscript)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .background(
                            RoundedRectangle(cornerRadius: 12).fill(brand.opacity(0.25))
                        )
                }

                if state.isThinking {
                    HStack(spacing: 4) {
                        ForEach(0..<3) { i in
                            Circle()
                                .fill(Color.white.opacity(0.7))
                                .frame(width: 5, height: 5)
                                .scaleEffect(state.isThinking ? 1 : 0.4)
                                .animation(
                                    .easeInOut(duration: 0.6)
                                        .repeatForever()
                                        .delay(Double(i) * 0.15),
                                    value: state.isThinking
                                )
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(white: 0.12)))
                } else if !state.replyText.isEmpty {
                    Text(state.replyText)
                        .font(.system(size: 13))
                        .foregroundStyle(.white)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color(white: 0.12)))
                }

                Button {
                    state.path.removeLast()
                    state.resetRecord()
                } label: {
                    Label("再问一次", systemImage: "mic.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(brand)
                .padding(.top, 4)
            }
            .padding(.horizontal, 4)
        }
        .background(Color.black)
    }
}
