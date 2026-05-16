import SwiftUI

struct HomeView: View {
    @EnvironmentObject var state: AppState

    private let brand = Color(red: 0.06, green: 0.64, blue: 0.49)

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 6) {
                Button {
                    if Config.hasKey {
                        state.path.append(.record)
                    } else {
                        state.path.append(.settings)
                    }
                } label: {
                    VStack(spacing: 6) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(
                                    RadialGradient(
                                        colors: [brand, brand.opacity(0.65)],
                                        center: .center,
                                        startRadius: 4,
                                        endRadius: 60
                                    )
                                )
                                .frame(width: 72, height: 72)
                                .shadow(color: brand.opacity(0.5), radius: 8, y: 4)

                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        Text("ChatGPT")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)

                if !Config.hasKey {
                    Text("点开图标设置 API Key")
                        .font(.system(size: 9))
                        .foregroundStyle(.orange)
                }
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        state.path.append(.settings)
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(.gray)
                            .padding(6)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
        }
    }
}
