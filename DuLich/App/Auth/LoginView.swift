import SwiftUI
import AuthenticationServices
import CryptoKit
import GoogleSignIn

struct LoginView: View {
    var isEmbedded = false
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        Group {
            if isEmbedded {
                screen
            } else {
                NavigationStack { screen }
            }
        }
    }

    private var screen: some View {
        ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    AuthHero(title: "Chào mừng trở lại", subtitle: "Đăng nhập để tiếp tục")
                        .padding(.top, 12)
                        .padding(.bottom, 28)

                    VStack(spacing: 18) {
                        AuthFormField(title: "Email", text: $email, keyboard: .emailAddress, contentType: .emailAddress)
                        AuthFormField(title: "Mật khẩu", text: $password, secure: true, contentType: .password)
                    }
                    if let error = authViewModel.errorMessage {
                        AuthErrorMessage(message: error).padding(.top, 14)
                    }
                    NavigationLink { PasswordRecoveryView() } label: {
                        Text("Quên mật khẩu?")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(AuthStyle.ink)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.top, 16)

                    AuthActionButton(title: "Đăng nhập", isLoading: authViewModel.isLoading, isDisabled: !isFormValid) {
                        Task {
                            await authViewModel.login(email: email, password: password)
                            if authViewModel.isLoggedIn { dismiss() }
                        }
                    }
                    .padding(.top, 28)
                    SocialSignInOptions().padding(.top, 30)
                    HStack(spacing: 5) {
                        Text("Bạn chưa có tài khoản?").foregroundStyle(AuthStyle.muted)
                        NavigationLink { RegisterView(isEmbedded: true) } label: {
                            Text("Đăng ký")
                                .fontWeight(.semibold)
                                .foregroundStyle(AuthStyle.ink)
                        }
                    }
                    .font(.system(size: 14))
                    .frame(maxWidth: .infinity)
                    .padding(.top, 36)
                    .padding(.bottom, 28)
                }
                .frame(maxWidth: 480)
                .padding(.horizontal, 22)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(AuthStyle.paper.ignoresSafeArea())
            .toolbar {
                if !isEmbedded {
                    ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(AuthStyle.ink)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(Text("Đóng"))
                    }
                }
            }
    }

    private var isFormValid: Bool {
        email.contains("@") && !password.isEmpty
    }
}

enum AuthStyle {
    static let paper = Color(hex: "F8F7F3")
    static let ink = Color(hex: "18323D")
    static let muted = Color(hex: "657780")
    static let line = Color(hex: "CBD4D4")
    static let accent = Color(hex: "176B79")
}

struct AuthBrandHeader: View {
    var body: some View {
        HStack(spacing: 4) {
            Image("HoteliaMark")
                .resizable()
                .scaledToFit()
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)
            Text("Hotelia")
                .font(.system(size: 24, weight: .medium, design: .serif))
                .tracking(-0.7)
                .foregroundStyle(AuthStyle.ink)
        }
        .accessibilityElement(children: .combine)
    }
}

struct AuthHero: View {
    let title: String
    let subtitle: String

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            Image("WelcomeCoast")
                .resizable()
                .scaledToFill()
                .frame(height: 206)
                .frame(maxWidth: .infinity)
                .clipped()
                .accessibilityHidden(true)

            LinearGradient(
                colors: [.black.opacity(0.08), Color(hex: "071C23").opacity(0.88)],
                startPoint: .top,
                endPoint: .bottom
            )
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 4) {
                    Image("HoteliaMark")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 38, height: 38)
                        .accessibilityHidden(true)
                    Text("Hotelia")
                        .font(.system(size: 19, weight: .medium, design: .serif))
                }
                .foregroundStyle(.white.opacity(0.94))
                Spacer()
                Text(LocalizedStringKey(title))
                    .font(.system(size: 31, weight: .medium, design: .serif))
                    .tracking(-0.8)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text(LocalizedStringKey(subtitle))
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.88))
                    .padding(.top, 4)
            }
            .padding(22)
        }
        .frame(height: 206)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .accessibilityElement(children: .combine)
    }
}

struct AuthFormField: View {
    let title: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var secure = false
    var contentType: UITextContentType? = nil
    var capitalization: TextInputAutocapitalization = .never
    var invalid = false
    @State private var showsText = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(LocalizedStringKey(title))
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(AuthStyle.ink)
            HStack(spacing: 8) {
                Group {
                    if secure && !showsText {
                        SecureField(LocalizedStringKey(title), text: $text)
                    } else {
                        TextField(LocalizedStringKey(title), text: $text)
                            .keyboardType(keyboard)
                            .textInputAutocapitalization(capitalization)
                            .autocorrectionDisabled()
                    }
                }
                .textContentType(contentType)
                .font(.system(size: 16))
                .foregroundStyle(AuthStyle.ink)
                .focused($focused)

                if secure {
                    Button { showsText.toggle() } label: {
                        Image(systemName: showsText ? "eye.slash" : "eye")
                            .font(.system(size: 17, weight: .regular))
                            .foregroundStyle(AuthStyle.muted)
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(Text(showsText ? "Ẩn mật khẩu" : "Hiện mật khẩu"))
                }
            }
            .padding(.leading, 16)
            .padding(.trailing, secure ? 5 : 16)
            .frame(height: 54)
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(invalid ? AppColors.error : (focused ? AuthStyle.accent : AuthStyle.line),
                            lineWidth: focused || invalid ? 1.5 : 1)
            }
            .animation(.easeOut(duration: 0.18), value: focused)
        }
    }
}

struct AuthErrorMessage: View {
    let message: String
    var body: some View {
        Label(message, systemImage: "exclamationmark.circle.fill")
            .font(.system(size: 13))
            .foregroundStyle(AppColors.error)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityElement(children: .combine)
    }
}

struct AuthActionButton: View {
    let title: String
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading { ProgressView().tint(.white) }
                Text(LocalizedStringKey(title))
                    .font(.system(size: 16, weight: .semibold))
                if !isLoading { Image(systemName: "arrow.right").font(.system(size: 14, weight: .semibold)) }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(isDisabled ? AuthStyle.muted : AuthStyle.ink, in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(AuthPressStyle())
        .disabled(isDisabled || isLoading)
    }
}

private struct AuthPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
    }
}

struct SocialSignInOptions: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var appleNonce = ""

    var body: some View {
        VStack(spacing: AppSpacing.base) {
            HStack(spacing: AppSpacing.sm) {
                Rectangle().frame(height: 1).foregroundStyle(AppColors.border)
                Text(L10n.text("social_continue_with"))
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)
                    .fixedSize()
                Rectangle().frame(height: 1).foregroundStyle(AppColors.border)
            }

            Button(action: {
                Task { await signInWithGoogle() }
            }) {
                HStack(spacing: 0) {
                    Image("google")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 21, height: 21)
                    Spacer(minLength: 8)
                    Text(L10n.text("google_button"))
                        .font(.system(size: 16, weight: .semibold))
                    Spacer(minLength: 8)
                    Color.clear.frame(width: 21, height: 21)
                }
                .foregroundStyle(AuthStyle.ink)
                .padding(.horizontal, 19)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(.white, in: RoundedRectangle(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AuthStyle.line, lineWidth: 1)
                }
            }
            .buttonStyle(AuthPressStyle())
            .disabled(authViewModel.isLoading)

            SignInWithAppleButton(.signIn, onRequest: { request in
                appleNonce = UUID().uuidString + UUID().uuidString
                let digest = SHA256.hash(data: Data(appleNonce.utf8))
                request.nonce = digest.map { String(format: "%02x", $0) }.joined()
                request.requestedScopes = [.fullName, .email]
            }, onCompletion: { result in
                switch result {
                case .success(let authorization):
                    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                          let data = credential.identityToken,
                          let token = String(data: data, encoding: .utf8) else {
                        authViewModel.showSocialError(SocialSignInError.missingToken)
                        return
                    }
                    let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                        .compactMap { $0 }.joined(separator: " ")
                    Task { await authViewModel.socialLogin(provider: "apple", idToken: token,
                        name: name.isEmpty ? nil : name, nonce: appleNonce) }
                case .failure(let error):
                    if (error as? ASAuthorizationError)?.code != .canceled {
                        authViewModel.showSocialError(error)
                    }
                }
            })
            .signInWithAppleButtonStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .disabled(authViewModel.isLoading)
        }
    }

    private func signInWithGoogle() async {
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String,
              let controller = topViewController() else {
            authViewModel.showSocialError(SocialSignInError.missingConfiguration)
            return
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: controller)
            guard let token = result.user.idToken?.tokenString else { throw SocialSignInError.missingToken }
            await authViewModel.socialLogin(provider: "google", idToken: token)
        } catch {
            authViewModel.showSocialError(error)
        }
    }

    private func topViewController() -> UIViewController? {
        var current = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController
        while let presented = current?.presentedViewController { current = presented }
        return current
    }
}

private enum SocialSignInError: LocalizedError {
    case missingToken, missingConfiguration

    var errorDescription: String? {
        switch self {
        case .missingToken: L10n.text("social_missing_token")
        case .missingConfiguration: L10n.text("social_missing_configuration")
        }
    }
}
