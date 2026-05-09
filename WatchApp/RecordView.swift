import SwiftUI

struct RecordView: View {
    @EnvironmentObject var state: AppState
    @StateObject private var recorder = AudioRecorder()

    private let brand = Color(red: 0.06, green: 0.64, blue: 0.49)
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 8) {
            Text(state.isRecording ? "● 正在录音…" : "轻点话筒开始")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(state.isRecording ? .red : .secondary)

            WaveformView(isActive: state.isRecording, color: brand)

            Text(formatTime(state.elapsed))
                .font(.system(size: 14, weight: .medium, design: .monospaced))
                .foregroundStyle(.white)

            Button {
                Task { await toggle() }
            } label: {
                ZStack {
                    Circle()
                        .fill(state.isRecording ? Color.red : brand)
                        .frame(width: 58, height: 58)
                        .shadow(color: (state.isRecording ? Color.red : brand).opacity(0.5),
                                radius: 8, y: 3)

                    Image(systemName: state.isRecording ? "paperplane.fill" : "mic.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .buttonStyle(.plain)

            if let err = state.errorMessage {
                Text(err)
                    .font(.system(size: 10))
                    .foregroundStyle(.red)
                    .lineLimit(2)
                    .padding(.horizontal, 6)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .onReceive(timer) { _ in
            if state.isRecording { state.elapsed += 1 }
        }
        .onDisappear {
            if state.isRecording {
                _ = recorder.stop()
                state.isRecording = false
            }
        }
    }

    private func formatTime(_ s: Int) -> String {
        String(format: "%d:%02d", s / 60, s % 60)
    }

    private func toggle() async {
        state.errorMessage = nil
        if !state.isRecording {
            do {
                try await recorder.start()
                state.elapsed = 0
                state.isRecording = true
            } catch {
                state.errorMessage = error.localizedDescription
            }
            return
        }

        // 第二次点击 → 停止 + 发送
        state.isRecording = false
        guard let url = recorder.stop() else {
            state.errorMessage = "录音文件丢失"
            return
        }

        state.isThinking = true
        state.replyText = ""
        state.lastTranscript = ""
        state.path.append(.reply)

        do {
            let transcript = try await OpenAIClient.shared.transcribe(audioURL: url)
            state.lastTranscript = transcript
            let reply = try await OpenAIClient.shared.chat(prompt: transcript)
            state.replyText = reply
        } catch {
            state.replyText = "出错:\(error.localizedDescription)"
        }
        state.isThinking = false
    }
}

private struct WaveformView: View {
    let isActive: Bool
    let color: Color

    @State private var heights: [CGFloat] = Array(repeating: 4, count: 17)
    private let timer = Timer.publish(every: 0.12, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 2) {
            ForEach(heights.indices, id: \.self) { i in
                Capsule()
                    .fill(isActive ? color : Color.gray.opacity(0.6))
                    .frame(width: 3, height: heights[i])
                    .animation(.easeInOut(duration: 0.18), value: heights[i])
            }
        }
        .frame(height: 32)
        .onReceive(timer) { _ in
            guard isActive else {
                if heights.contains(where: { $0 != 4 }) {
                    heights = Array(repeating: 4, count: heights.count)
                }
                return
            }
            heights = (0..<heights.count).map { _ in CGFloat.random(in: 4...28) }
        }
    }
}
