import SwiftUI

struct AddContactView: View {
    @EnvironmentObject var store: ContactStore
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var prompt: String = ""
    @State private var selectedEmoji: String = "🙂"

    private let emojis = [
        "🌸","🐱","🐶","🦊","🐰","🐻","🐼","🦁","🐯","🦄",
        "🌹","🍑","☀️","🌙","⭐","🍀","🍓","🥑","🍩","🎵",
        "🎮","📚","✨","💫","💖","😊","😎","🤓","🥰","😴"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("头像") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 6),
                              spacing: 6) {
                        ForEach(emojis, id: \.self) { e in
                            Text(e)
                                .font(.system(size: 22))
                                .frame(width: 40, height: 40)
                                .background(selectedEmoji == e
                                            ? Color.wechatGreen.opacity(0.18)
                                            : Color(.secondarySystemBackground))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(selectedEmoji == e ? Color.wechatGreen : Color.clear,
                                                lineWidth: 2)
                                )
                                .cornerRadius(6)
                                .onTapGesture { selectedEmoji = e }
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("昵称") {
                    TextField("比如「小雅」", text: $name)
                        .textInputAutocapitalization(.never)
                }

                Section {
                    TextEditor(text: $prompt)
                        .frame(minHeight: 140)
                } header: {
                    Text("人设 / 角色描述 (system prompt)")
                } footer: {
                    Text("写得越具体,聊起来越像真人。可以包含性格、说话习惯、口头禅、回复长度偏好、要不要主动追问等。")
                }
            }
            .navigationTitle("添加 AI 联系人")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("保存") { save() }
                        .bold()
                        .disabled(!canSave)
                }
            }
        }
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func save() {
        let c = Contact(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            avatar: selectedEmoji,
            systemPrompt: prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        store.addContact(c)
        dismiss()
    }
}
