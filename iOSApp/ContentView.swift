import SwiftUI

// 微信主色
extension Color {
    static let wechatGreen = Color(red: 7/255, green: 193/255, blue: 96/255)
    static let wechatBubble = Color(red: 149/255, green: 236/255, blue: 105/255)
    static let wechatBg = Color(red: 237/255, green: 237/255, blue: 237/255)
    static let wechatChatBg = Color(red: 237/255, green: 237/255, blue: 237/255)
}

struct RootTabView: View {
    @EnvironmentObject var store: ContactStore

    var body: some View {
        TabView {
            ChatListView()
                .tabItem {
                    Image(systemName: "message.fill")
                    Text("微信")
                }

            ContactsView()
                .tabItem {
                    Image(systemName: "person.2.fill")
                    Text("通讯录")
                }

            DiscoverView()
                .tabItem {
                    Image(systemName: "safari.fill")
                    Text("发现")
                }

            MeView()
                .tabItem {
                    Image(systemName: "person.crop.circle.fill")
                    Text("我")
                }
        }
        .tint(.wechatGreen)
    }
}
