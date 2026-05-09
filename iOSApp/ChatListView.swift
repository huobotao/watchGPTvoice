import SwiftUI

struct ChatListView: View {
    @EnvironmentObject var store: ContactStore
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            Group {
                if store.contacts.isEmpty {
                    VStack(spacing: 8) {
                        Text("还没有联系人")
                            .font(.headline)
                        Text("点右上角 + 添加一个 AI 朋友")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                } else {
                    List {
                        ForEach(store.contacts) { c in
                            NavigationLink(value: c.id) {
                                ChatRowView(contact: c, last: store.lastMessage(for: c.id))
                            }
                        }
                        .onDelete(perform: deleteContact)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("微信")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: {
                        Image(systemName: "plus")
                    }
                    .tint(.wechatGreen)
                }
            }
            .sheet(isPresented: $showAdd) {
                AddContactView()
                    .environmentObject(store)
            }
            .navigationDestination(for: String.self) { contactId in
                ChatDetailView(contactId: contactId)
                    .environmentObject(store)
            }
        }
    }

    private func deleteContact(at offsets: IndexSet) {
        for idx in offsets {
            let c = store.contacts[idx]
            store.deleteContact(c.id)
        }
    }
}

struct ChatRowView: View {
    let contact: Contact
    let last: ChatMessage?

    var body: some View {
        HStack(spacing: 12) {
            Text(contact.avatar)
                .font(.system(size: 28))
                .frame(width: 48, height: 48)
                .background(LinearGradient(
                    colors: [Color.orange.opacity(0.4), Color.pink.opacity(0.5)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                .cornerRadius(6)

            VStack(alignment: .leading, spacing: 4) {
                Text(contact.name)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.primary)
                Text(previewText)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(timeText)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding(.vertical, 4)
    }

    private var previewText: String {
        guard let last else { return "点这里开始聊天" }
        let prefix = last.role == .user ? "我: " : ""
        return prefix + last.content.replacingOccurrences(of: "\n", with: " ")
    }

    private var timeText: String {
        guard let last else { return "" }
        let f = DateFormatter()
        if Calendar.current.isDateInToday(last.time) {
            f.dateFormat = "HH:mm"
        } else {
            f.dateFormat = "M/d"
        }
        return f.string(from: last.time)
    }
}
