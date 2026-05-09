import SwiftUI

struct ContactsView: View {
    @EnvironmentObject var store: ContactStore
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(store.contacts) { c in
                        HStack(spacing: 12) {
                            Text(c.avatar)
                                .font(.system(size: 22))
                                .frame(width: 40, height: 40)
                                .background(Color(.secondarySystemBackground))
                                .cornerRadius(5)
                            Text(c.name)
                            Spacer()
                        }
                    }
                    .onDelete { offsets in
                        for idx in offsets { store.deleteContact(store.contacts[idx].id) }
                    }
                } header: {
                    Text("AI 联系人")
                }

                if store.contacts.isEmpty {
                    Text("还没有联系人,点右上角加一个")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("通讯录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                        .tint(.wechatGreen)
                }
            }
            .sheet(isPresented: $showAdd) {
                AddContactView().environmentObject(store)
            }
        }
    }
}
