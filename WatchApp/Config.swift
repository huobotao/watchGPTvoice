import Foundation

enum Config {
    // 运行时存储的 Key(从手表的设置页输入)
    static let keyDefaultsKey = "openai_api_key"

    // 编译期默认值。在 Xcode 里把下面这行换成你自己的 sk-... 也可以,
    // 但更推荐的方式:运行 App 后从设置页粘贴,避免 Key 进 git。
    static let compiledInDefaultKey = ""

    static var openAIKey: String {
        let saved = UserDefaults.standard.string(forKey: keyDefaultsKey) ?? ""
        return saved.isEmpty ? compiledInDefaultKey : saved
    }

    static var hasKey: Bool { !openAIKey.isEmpty }

    static let chatModel = "gpt-4o-mini"
    static let whisperModel = "whisper-1"
    static let language = "zh"
    static let systemPrompt =
        "你是手表上的简洁助手。回答必须很短,1–3 句话,不超过 80 个汉字。不要使用 Markdown。"
}
