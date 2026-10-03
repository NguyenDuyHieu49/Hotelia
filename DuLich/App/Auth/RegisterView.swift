import SwiftUI

struct RegisterView: View {
    var isEmbedded = false
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmPassword = ""

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
                    AuthHero(title: "Tạo tài khoản", subtitle: "Đăng ký để bắt đầu")
                        .padding(.top, 12)
                        .padding(.bottom, 28)

                    VStack(spacing: 18) {
                        AuthFormField(title: "Họ và tên", text: $name, contentType: .name, capitalization: .words)
                        AuthFormField(title: "Email", text: $email, keyboard: .emailAddress, contentType: .emailAddress)
                        AuthFormField(title: "Số điện thoại", text: $phone, keyboard: .phonePad, contentType: .telephoneNumber)
                        AuthFormField(title: "Mật khẩu", text: $password, secure: true, contentType: .newPassword)
                        AuthFormField(title: "Xác nhận mật khẩu", text: $confirmPassword, secure: true, contentType: .newPassword,
                                      invalid: !confirmPassword.isEmpty && !passwordsMatch)
                    }
                    if !confirmPassword.isEmpty && !passwordsMatch {
                        AuthErrorMessage(message: L10n.text("Mật khẩu không khớp")).padding(.top, 14)
                    }
                    if let error = authViewModel.errorMessage {
                        AuthErrorMessage(message: error).padding(.top, 14)
                    }

                    Text("Khi đăng ký, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật")
                        .font(.system(size: 12))
                        .foregroundStyle(AuthStyle.muted)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 22)

                    AuthActionButton(title: "Đăng ký", isLoading: authViewModel.isLoading, isDisabled: !isFormValid) {
                        Task {
                            await authViewModel.register(email: email, password: password, name: name,
                                                         phone: phone.isEmpty ? nil : phone)
                            if authViewModel.isLoggedIn { dismiss() }
                        }
                    }
                    .padding(.top, 24)
                    SocialSignInOptions().padding(.top, 30)

                    HStack(spacing: 5) {
                        Text("Bạn đã có tài khoản?").foregroundStyle(AuthStyle.muted)
                        NavigationLink { LoginView(isEmbedded: true) } label: {
                            Text("Đăng nhập").fontWeight(.semibold).foregroundStyle(AuthStyle.ink)
                        }
                    }
                    .font(.system(size: 14))
                    .frame(maxWidth: .infinity)
                    .padding(.top, 32)
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

    private var passwordsMatch: Bool { password == confirmPassword }
    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        email.contains("@") && password.count >= 6 && passwordsMatch
    }
}
