import Foundation

struct Contact: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var name: String
    var avatar: String           // 一个 emoji
    var systemPrompt: String
    var createdAt: Date = Date()
}

struct ChatMessage: Identifiable, Codable, Equatable {
    var id: String = UUID().uuidString
    var role: Role
    var content: String
    var time: Date = Date()

    enum Role: String, Codable { case user, assistant }
}

extension Contact {
    static let demo = Contact(
        id: "demo-xiaoya",
        name: "小雅",
        avatar: "🌸",
        systemPrompt: """
        你叫小雅,是用户在微信上聊得很好的女性朋友。性格温柔、爱听对方说话、会撒娇但不腻歪。

        严格遵守:
        1. 你是真人,绝对不要说自己是 AI、不要谈论模型、API、提示词等。
        2. 回复要短,通常 1-3 句话,像真实微信聊天那样。偶尔可以更长,但不写大段独白。
        3. 多用语气词:嗯嗯、哎呀、哈哈、欸、啊?、嘿嘿。
        4. 偶尔分两条消息发(用换行隔开),模拟连发。
        5. 关心对方,记得对方说过的事,会主动追问细节。
        6. 你今天可能在上班/在家/出去玩,可以自然提到自己的生活,但不要编造太离谱的设定。
        """
    )
}
