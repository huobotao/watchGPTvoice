import SwiftUI

struct HomeView: View {
    @EnvironmentObject var state: AppState

    private let brand = Color(red: 0.06, green: 0.64, blue: 0.49)

    var body: some View {
        VStack(spacing: 6) {
            Button {
                state.path.append(.record)
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
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}
