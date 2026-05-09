import SwiftUI

struct ChatDetailView: View {
    @EnvironmentObject var store: ContactStore
    let contactId: String

    @State private var input: String = ""
    @FocusState private var inputFocused: Bool

    private var contact: Contact? {
        store.contacts.first(where: { $0.id == contactId })
    }

    private var messages: [ChatMessage] {
        store.messages(for: contactId)
    }

    private var sending: Bool {
        store.sendingContactId == contactId
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        if messages.isEmpty {
                            Text("和 \(contact?.name ?? "TA") 还没有聊天记录,打个招呼吧")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 24)
                        }

                        ForEach(messages) { msg in
                            BubbleRow(message: msg, contact: contact)
                                .id(msg.id)
                        }

                        if sending {
                            BubbleRow.thinking(contact: contact)
                                .id("__thinking__")
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 12)
                }
                .background(Color.wechatChatBg)
                .onChange(of: messages.count) { _, _ in
                    scrollToBottom(proxy)
                }
                .onChange(of: sending) { _, _ in
                    scrollToBottom(proxy)
                }
                .onAppear { scrollToBottom(proxy) }
            }

            inputBar
        }
        .navigationTitle(contact?.name ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button(role: .destructive) {
                        store.deleteContact(contactId)
                    } label: {
                        Label("删除联系人和聊天", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                }
            }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 6) {
            Image(systemName: "mic.fill")
                .frame(width: 36, height: 36)
                .background(Color(.systemBackground))
                .cornerRadius(4)
                .foregroundStyle(.primary)

            TextField("输入消息...", text: $input, axis: .vertical)
                .lineLimit(1...4)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color(.systemBackground))
                .cornerRadius(4)
                .focused($inputFocused)
                .submitLabel(.send)
                .onSubmit { send() }

            Image(systemName: "face.smiling")
                .frame(width: 36, height: 36)
                .background(Color(.systemBackground))
                .cornerRadius(4)
                .foregroundStyle(.primary)

            if !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Button(action: send) {
                    Text("发送")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                        .background(Color.wechatGreen)
                        .cornerRadius(4)
                }
                .disabled(sending)
            } else {
                Image(systemName: "plus")
                    .frame(width: 36, height: 36)
                    .background(Color(.systemBackground))
                    .cornerRadius(4)
                    .foregroundStyle(.primary)
            }
        }
        .padding(8)
        .background(Color(red: 247/255, green: 247/255, blue: 247/255))
        .overlay(
            Rectangle()
                .frame(height: 1 / UIScreen.main.scale)
                .foregroundStyle(Color(.separator)),
            alignment: .top
        )
    }

    private func send() {
        let text = input
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        input = ""
        Task { await store.send(text, to: contactId) }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            if sending {
                proxy.scrollTo("__thinking__", anchor: .bottom)
            } else if let last = messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }
}

struct BubbleRow: View {
    let message: ChatMessage
    let contact: Contact?
    let isThinking: Bool

    init(message: ChatMessage, contact: Contact?) {
        self.message = message
        self.contact = contact
        self.isThinking = false
    }

    private init(thinkingContact: Contact?) {
        self.message = ChatMessage(role: .assistant, content: "正在输入...")
        self.contact = thinkingContact
        self.isThinking = true
    }

    static func thinking(contact: Contact?) -> BubbleRow {
        BubbleRow(thinkingContact: contact)
    }

    var body: some View {
        let isOut = message.role == .user
        HStack(alignment: .top, spacing: 8) {
            if isOut { Spacer(minLength: 40) }

            if !isOut {
                avatarView(text: contact?.avatar ?? "🙂",
                           gradient: [.orange.opacity(0.5), .pink.opacity(0.5)])
            }

            Text(message.content)
                .font(.system(size: 15))
                .foregroundStyle(isThinking ? .secondary : .primary)
                .italic(isThinking)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(isOut ? Color.wechatBubble : Color(.systemBackground))
                .cornerRadius(6)
                .frame(maxWidth: 260, alignment: isOut ? .trailing : .leading)
                .fixedSize(horizontal: false, vertical: true)

            if isOut {
                avatarView(text: "我",
                           gradient: [.blue.opacity(0.6), .cyan.opacity(0.6)])
            }

            if !isOut { Spacer(minLength: 40) }
        }
    }

    private func avatarView(text: String, gradient: [Color]) -> some View {
        Text(text)
            .font(.system(size: 18))
            .foregroundStyle(.white)
            .frame(width: 36, height: 36)
            .background(LinearGradient(colors: gradient,
                                       startPoint: .topLeading,
                                       endPoint: .bottomTrailing))
            .cornerRadius(5)
    }
}
