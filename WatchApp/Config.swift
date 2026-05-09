import Foundation

// ⚠️ GitHub Secret Scanning 拒绝把 OpenAI Key 推到远端,所以此处改为占位符。
// 在你本地 Xcode 里把下面这一行替换为你那把 sk-proj-... 的完整 Key 即可。
// 注意:不要把替换后的文件再 commit & push,否则 GitHub 仍会拦截 / OpenAI 会自动 revoke。
// 长期方案:做个轻量代理(Cloudflare Worker / Vercel Edge),Key 留服务端。
enum Config {
    static let openAIKey = "PASTE_YOUR_OPENAI_KEY_HERE"

    static let chatModel = "gpt-4o-mini"
    static let whisperModel = "whisper-1"
    static let language = "zh"
    static let systemPrompt =
        "你是手表上的简洁助手。回答必须很短,1–3 句话,不超过 80 个汉字。不要使用 Markdown。"
}
