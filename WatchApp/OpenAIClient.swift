import Foundation

final class OpenAIClient {
    static let shared = OpenAIClient()
    private init() {}

    private let baseURL = URL(string: "https://api.openai.com/v1")!

    // MARK: - Whisper 语音转文字

    func transcribe(audioURL: URL) async throws -> String {
        let url = baseURL.appendingPathComponent("audio/transcriptions")
        let boundary = "Boundary-\(UUID().uuidString)"

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(Config.openAIKey)", forHTTPHeaderField: "Authorization")
        req.setValue("multipart/form-data; boundary=\(boundary)",
                     forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 60

        var body = Data()
        body.appendField(boundary: boundary, name: "model", value: Config.whisperModel)
        body.appendField(boundary: boundary, name: "language", value: Config.language)
        try body.appendFile(boundary: boundary, name: "file",
                            filename: "audio.m4a", contentType: "audio/m4a", fileURL: audioURL)
        body.append("--\(boundary)--\r\n")

        let (data, resp) = try await URLSession.shared.upload(for: req, from: body)
        try Self.validate(resp, data: data)

        struct R: Decodable { let text: String }
        return try JSONDecoder().decode(R.self, from: data).text
    }

    // MARK: - Chat Completion

    func chat(prompt: String) async throws -> String {
        let url = baseURL.appendingPathComponent("chat/completions")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(Config.openAIKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.timeoutInterval = 60

        let payload: [String: Any] = [
            "model": Config.chatModel,
            "messages": [
                ["role": "system", "content": Config.systemPrompt],
                ["role": "user",   "content": prompt]
            ],
            "temperature": 0.6
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.validate(resp, data: data)

        struct R: Decodable {
            struct Choice: Decodable { let message: Message }
            struct Message: Decodable { let content: String }
            let choices: [Choice]
        }
        let r = try JSONDecoder().decode(R.self, from: data)
        return r.choices.first?.message.content.trimmingCharacters(in: .whitespacesAndNewlines)
            ?? "(无回复)"
    }

    private static func validate(_ resp: URLResponse, data: Data) throws {
        guard let http = resp as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let snippet = String(data: data.prefix(300), encoding: .utf8) ?? ""
            throw NSError(domain: "OpenAI", code: http.statusCode,
                          userInfo: [NSLocalizedDescriptionKey:
                                        "HTTP \(http.statusCode): \(snippet)"])
        }
    }
}

// MARK: - multipart helpers

private extension Data {
    mutating func append(_ s: String) {
        if let d = s.data(using: .utf8) { append(d) }
    }

    mutating func appendField(boundary: String, name: String, value: String) {
        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n")
        append("\(value)\r\n")
    }

    mutating func appendFile(boundary: String, name: String, filename: String,
                             contentType: String, fileURL: URL) throws {
        let fileData = try Data(contentsOf: fileURL)
        append("--\(boundary)\r\n")
        append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n")
        append("Content-Type: \(contentType)\r\n\r\n")
        append(fileData)
        append("\r\n")
    }
}
