import SwiftUI

struct ContentView: View {
    // 默认从 GitHub Pages 拉取，永远是最新版本。
    // 想用 App 内置 HTML（离线可用），把下面这行改成 nil，并把 sunrise-sunset.html
    // 添加到 Xcode 项目的 Bundle Resources 里。
    private static let remoteURL: URL? = URL(
        string: "https://huobotao.github.io/watchGPTvoice/sunrise-sunset.html"
    )

    var body: some View {
        Group {
            if let url = Self.remoteURL {
                WebView(source: .remote(url))
            } else if let local = Bundle.main.url(forResource: "sunrise-sunset", withExtension: "html") {
                WebView(source: .local(local))
            } else {
                VStack(spacing: 12) {
                    Text("找不到 sunrise-sunset.html")
                    Text("把 HTML 加入 Bundle 或设置 remoteURL")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .ignoresSafeArea()
        .background(Color(red: 0.043, green: 0.071, blue: 0.125))
    }
}

#Preview {
    ContentView()
}
