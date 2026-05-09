import Foundation

@MainActor
final class ContactStore: ObservableObject {
    @Published var contacts: [Contact] = []
    @Published var messagesByContactId: [String: [ChatMessage]] = [:]
    @Published var sendingContactId: String? = nil

    init() {
        contacts = Storage.loadContacts()
        for c in contacts {
            messagesByContactId[c.id] = Storage.loadMessages(for: c.id)
        }
    }

    func messages(for contactId: String) -> [ChatMessage] {
        messagesByContactId[contactId] ?? []
    }

    func lastMessage(for contactId: String) -> ChatMessage? {
        messages(for: contactId).last
    }

    // MARK: - 联系人

    func addContact(_ c: Contact) {
        contacts.insert(c, at: 0)
        messagesByContactId[c.id] = []
        Storage.saveContacts(contacts)
    }

    func deleteContact(_ id: String) {
        contacts.removeAll { $0.id == id }
        messagesByContactId.removeValue(forKey: id)
        Storage.saveContacts(contacts)
        Storage.deleteMessages(for: id)
    }

    func updateContact(_ c: Contact) {
        if let idx = contacts.firstIndex(where: { $0.id == c.id }) {
            contacts[idx] = c
            Storage.saveContacts(contacts)
        }
    }

    // MARK: - 消息

    func send(_ text: String, to contactId: String) async {
        guard let contact = contacts.first(where: { $0.id == contactId }) else { return }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        var history = messages(for: contactId)
        history.append(ChatMessage(role: .user, content: trimmed))
        messagesByContactId[contactId] = history
        Storage.saveMessages(history, for: contactId)

        sendingContactId = contactId
        defer { sendingContactId = nil }

        do {
            let reply = try await ClaudeClient.reply(contact: contact, history: history)
            history.append(ChatMessage(role: .assistant, content: reply))
        } catch {
            let msg = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            history.append(ChatMessage(role: .assistant, content: "【出错了】\(msg)"))
        }
        messagesByContactId[contactId] = history
        Storage.saveMessages(history, for: contactId)

        // 把这个联系人挪到最前(最近活跃)
        if let idx = contacts.firstIndex(where: { $0.id == contactId }), idx != 0 {
            let c = contacts.remove(at: idx)
            contacts.insert(c, at: 0)
            Storage.saveContacts(contacts)
        }
    }
}
