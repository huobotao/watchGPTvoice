import SwiftUI

// 占位页面,微信「发现」tab 的样子,功能不实现。
struct DiscoverView: View {
    var body: some View {
        NavigationStack {
            List {
                row("朋友圈", icon: "camera.fill", color: .orange)
                row("视频号", icon: "play.rectangle.fill", color: .red)
                row("扫一扫", icon: "qrcode.viewfinder", color: .green)
                row("摇一摇", icon: "iphone.radiowaves.left.and.right", color: .blue)
                row("看一看", icon: "newspaper.fill", color: .purple)
                row("搜一搜", icon: "magnifyingglass", color: .pink)
            }
            .navigationTitle("发现")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    @ViewBuilder
    private func row(_ title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(color)
                .cornerRadius(6)
            Text(title)
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 2)
    }
}
