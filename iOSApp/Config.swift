import Foundation

// 把 Anthropic Key 填这里就能直接跑;也可以留空,启动后在「我」-> 设置里填,
// 设置里填的会覆盖这里的默认值并保存到 UserDefaults。
enum Config {
    static let defaultApiKey: String = ""
    static let defaultModel: String = "claude-sonnet-4-6"

    static let availableModels: [String] = [
        "claude-sonnet-4-6",        // 推荐:够聪明、够便宜
        "claude-opus-4-7",          // 最聪明,最贵
        "claude-haiku-4-5-20251001" // 最快、最便宜
    ]
}
