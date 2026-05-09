import SwiftUI

struct MeView: View {
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        Text("👤")
                            .font(.system(size: 36))
                            .frame(width: 60, height: 60)
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(8)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("我").font(.title3).bold()
                            Text("点这里没东西看,这是个壳 ;)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Label("设置", systemImage: "gearshape.fill")
                    }
                }
            }
            .navigationTitle("我")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var store: ContactStore
    @State private var apiKey: String = Storage.apiKey
    @State private var model: String = Storage.model
    @State private var showCleared = false

    var body: some View {
        Form {
            Section {
                SecureField("sk-ant-...", text: $apiKey)
            } header: {
                Text("Anthropic API Key")
            } footer: {
                Text("仅保存在本机 UserDefaults,不会上传任何服务器。可以在 console.anthropic.com 创建。")
            }

            Section("模型") {
                Picker("模型", selection: $model) {
                    ForEach(Config.availableModels, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.menu)
            }

            Section {
                Button("保存设置") {
                    Storage.apiKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
                    Storage.model = model
                }
                .frame(maxWidth: .infinity)
                .foregroundStyle(.white)
                .listRowBackground(Color.wechatGreen)
            }

            Section {
                Button(role: .destructive) {
                    for c in store.contacts { store.deleteContact(c.id) }
                    showCleared = true
                } label: {
                    Text("清空所有联系人和聊天")
                        .frame(maxWidth: .infinity)
                }
            } footer: {
                Text("不可恢复。")
            }
        }
        .navigationTitle("设置")
        .navigationBarTitleDisplayMode(.inline)
        .alert("已清空", isPresented: $showCleared) {
            Button("好") { }
        }
    }
}
