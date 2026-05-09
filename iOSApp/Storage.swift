import Foundation

enum Storage {
    private static var docsDir: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private static var contactsURL: URL { docsDir.appendingPathComponent("contacts.json") }
    private static func messagesURL(_ contactId: String) -> URL {
        docsDir.appendingPathComponent("messages_\(contactId).json")
    }

    // MARK: - Contacts

    static func loadContacts() -> [Contact] {
        guard let data = try? Data(contentsOf: contactsURL),
              let list = try? JSONDecoder().decode([Contact].self, from: data) else {
            // 第一次启动:塞一个默认联系人
            let init_ = [Contact.demo]
            saveContacts(init_)
            return init_
        }
        return list
    }

    static func saveContacts(_ list: [Contact]) {
        if let data = try? JSONEncoder().encode(list) {
            try? data.write(to: contactsURL, options: .atomic)
        }
    }

    // MARK: - Messages

    static func loadMessages(for contactId: String) -> [ChatMessage] {
        guard let data = try? Data(contentsOf: messagesURL(contactId)),
              let list = try? JSONDecoder().decode([ChatMessage].self, from: data) else {
            return []
        }
        return list
    }

    static func saveMessages(_ msgs: [ChatMessage], for contactId: String) {
        if let data = try? JSONEncoder().encode(msgs) {
            try? data.write(to: messagesURL(contactId), options: .atomic)
        }
    }

    static func deleteMessages(for contactId: String) {
        try? FileManager.default.removeItem(at: messagesURL(contactId))
    }

    // MARK: - Settings

    private static let kApiKey = "anthropic_api_key"
    private static let kModel = "anthropic_model"

    static var apiKey: String {
        get { UserDefaults.standard.string(forKey: kApiKey) ?? Config.defaultApiKey }
        set { UserDefaults.standard.set(newValue, forKey: kApiKey) }
    }

    static var model: String {
        get { UserDefaults.standard.string(forKey: kModel) ?? Config.defaultModel }
        set { UserDefaults.standard.set(newValue, forKey: kModel) }
    }
}
