import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showLogin = false
    @State private var showRegister = false
    @State private var appeared = false

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                Image("WelcomeCoast")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                    .ignoresSafeArea()
                    .accessibilityHidden(true)

                LinearGradient(
                    stops: [
                        .init(color: Color(hex: "0B2229").opacity(0.35), location: 0),
                        .init(color: .clear, location: 0.28),
                        .init(color: Color(hex: "071C23").opacity(0.26), location: 0.48),
                        .init(color: Color(hex: "071C23").opacity(0.92), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 0) {
                        Image("HoteliaMark")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 48, height: 48)
                            .accessibilityHidden(true)
                        Text("Hotelia")
                            .font(.system(size: 26, weight: .medium, design: .serif))
                            .tracking(-0.5)
                    }
                    .foregroundStyle(.white)
                    .accessibilityElement(children: .combine)
                    .padding(.top, 22)

                    Spacer(minLength: 80)

                    Text("Tìm nơi dừng chân tiếp theo")
                        .font(.system(size: 42, weight: .medium, design: .serif))
                        .tracking(-1.4)
                        .lineSpacing(-3)
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.bottom, 14)

                    Text("Khám phá khách sạn, chọn phòng và đặt chỗ trong vài phút.")
                        .font(.system(size: 16))
                        .lineSpacing(4)
                        .foregroundStyle(.white.opacity(0.86))
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.bottom, 32)

                    VStack(spacing: 12) {
                        Button { showLogin = true } label: {
                            HStack {
                                Text("Đăng nhập")
                                Spacer()
                                Image(systemName: "arrow.right")
                            }
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color(hex: "14313A"))
                            .padding(.horizontal, 20)
                            .frame(height: 56)
                            .background(.white, in: RoundedRectangle(cornerRadius: 13))
                        }
                        .buttonStyle(WelcomePressStyle())

                        Button { showRegister = true } label: {
                            Text("Đăng ký")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(.white.opacity(0.13), in: RoundedRectangle(cornerRadius: 13))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 13)
                                        .stroke(.white.opacity(0.65), lineWidth: 1)
                                }
                        }
                        .buttonStyle(WelcomePressStyle())
                    }
                    .padding(.bottom, 24)
                }
                .padding(.horizontal, 28)
                .frame(maxWidth: 480, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .center)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared || reduceMotion ? 0 : 14)
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showLogin) {
            LoginView()
                .environmentObject(authViewModel)
                .preferredColorScheme(.light)
        }
        .sheet(isPresented: $showRegister) {
            RegisterView()
                .environmentObject(authViewModel)
                .preferredColorScheme(.light)
        }
        .onAppear {
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.55)) {
                appeared = true
            }
        }
    }
}

private struct WelcomePressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
    }
}
