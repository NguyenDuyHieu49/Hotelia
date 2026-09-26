import SwiftUI

struct LoginView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: AppSpacing.xl) {
                    // Header
                    VStack(spacing: AppSpacing.sm) {
                        Text("Chào mừng trở lại")
                            .font(AppTypography.title1)
                            .foregroundColor(AppColors.textPrimary)

                        Text("Đăng nhập để tiếp tục")
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    .padding(.top, AppSpacing.xxl)

                    // Form
                    VStack(spacing: AppSpacing.base) {
                        AppTextField(
                            placeholder: "Email",
                            text: $email,
                            icon: "envelope",
                            keyboardType: .emailAddress
                        )

                        AppTextField(
                            placeholder: "Mật khẩu",
                            text: $password,
                            icon: "lock",
                            isSecure: true
                        )

                        if let error = authViewModel.errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                Text(error)
                            }
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.error)
                            .padding(.top, AppSpacing.xs)
                        }
                    }
                    .padding(.horizontal, AppSpacing.base)

                    // Login Button
                    PrimaryButton(
                        title: "Đăng nhập",
                        action: {
                            Task {
                                await authViewModel.login(email: email, password: password)
                                if authViewModel.isLoggedIn {
                                    dismiss()
                                }
                            }
                        },
                        isLoading: authViewModel.isLoading,
                        isDisabled: !isFormValid
                    )
                    .padding(.horizontal, AppSpacing.base)

                    // Forgot Password
                    NavigationLink { PasswordRecoveryView() } label: {
                        Text("Quên mật khẩu?")
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.primary)
                    }

                    Spacer()

                    // Register Link
                    HStack {
                        Text("Bạn chưa có tài khoản?")
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)

                        NavigationLink { RegisterView() } label: {
                            Text("Đăng ký")
                                .font(AppTypography.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(AppColors.primary)
                        }
                    }
                    .padding(.bottom, AppSpacing.xxl)
                }
            }
            .background(AppColors.backgroundPrimary)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(AppColors.textPrimary)
                    }
                }
            }
        }
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }
}
