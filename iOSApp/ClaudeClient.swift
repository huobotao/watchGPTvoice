import Foundation

enum ClaudeError: LocalizedError {
    case missingKey
    case http(Int, String)
    case bad
    var errorDescription: String? {
        switch self {
        case .missingKey: return "还没填 Anthropic API Key,去「我」-> 设置 里填一下"
        case .http(let code, let body): return "HTTP \(code): \(body.prefix(200))"
        case .bad: return "Claude 返回了空内容"
        }
    }
}

struct ClaudeClient {
    static func reply(
        contact: Contact,
        history: [ChatMessage]
    ) async throws -> String {
        let apiKey = Storage.apiKey
        guard !apiKey.isEmpty else { throw ClaudeError.missingKey }

        // history 里只保留 role + content,丢掉 id/time
        struct OutMessage: Codable { let role: String; let content: String }
        let messages = history.map { OutMessage(role: $0.role.rawValue, content: $0.content) }

        struct Body: Codable {
            let model: String
            let max_tokens: Int
            let system: String
            let messages: [OutMessage]
        }
        let body = Body(
            model: Storage.model,
            max_tokens: 512,
            system: contact.systemPrompt,
            messages: messages
        )

        var req = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        req.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        req.httpBody = try JSONEncoder().encode(body)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw ClaudeError.bad }
        guard (200..<300).contains(http.statusCode) else {
            let txt = String(data: data, encoding: .utf8) ?? ""
            throw ClaudeError.http(http.statusCode, txt)
        }

        struct ContentBlock: Codable { let type: String; let text: String? }
        struct ResponseBody: Codable { let content: [ContentBlock] }
        let parsed = try JSONDecoder().decode(ResponseBody.self, from: data)
        guard let text = parsed.content.first(where: { $0.type == "text" })?.text else {
            throw ClaudeError.bad
        }
        return text
    }
}
