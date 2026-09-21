import SwiftUI

struct RegisterView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: AppSpacing.xl) {
                    // Header
                    VStack(spacing: AppSpacing.sm) {
                        Text("Tạo tài khoản")
                            .font(AppTypography.title1)
                            .foregroundColor(AppColors.textPrimary)

                        Text("Đăng ký để bắt đầu")
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    .padding(.top, AppSpacing.xl)

                    // Form
                    VStack(spacing: AppSpacing.base) {
                        AppTextField(
                            placeholder: "Họ và tên",
                            text: $name,
                            icon: "person"
                        )

                        AppTextField(
                            placeholder: "Email",
                            text: $email,
                            icon: "envelope",
                            keyboardType: .emailAddress
                        )

                        AppTextField(
                            placeholder: "Số điện thoại",
                            text: $phone,
                            icon: "phone",
                            keyboardType: .phonePad
                        )

                        AppTextField(
                            placeholder: "Mật khẩu",
                            text: $password,
                            icon: "lock",
                            isSecure: true
                        )

                        AppTextField(
                            placeholder: "Xác nhận mật khẩu",
                            text: $confirmPassword,
                            icon: "lock",
                            isSecure: true
                        )

                        if !passwordsMatch && !confirmPassword.isEmpty {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                Text("Mật khẩu không khớp")
                            }
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.error)
                        }

                        if let error = authViewModel.errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                Text(error)
                            }
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.error)
                        }
                    }
                    .padding(.horizontal, AppSpacing.base)

                    // Terms
                    HStack(alignment: .top, spacing: AppSpacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(AppColors.primary)
                            .font(.system(size: 20))

                        Text("Khi đăng ký, bạn đồng ý với")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                        +
                        Text(" Điều khoản sử dụng")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.primary)
                        +
                        Text(" và")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                        +
                        Text(" Chính sách bảo mật")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.primary)
                    }
                    .padding(.horizontal, AppSpacing.base)

                    // Register Button
                    PrimaryButton(
                        title: "Đăng ký",
                        action: {
                            Task {
                                await authViewModel.register(
                                    email: email,
                                    password: password,
                                    name: name,
                                    phone: phone.isEmpty ? nil : phone
                                )
                                if authViewModel.isLoggedIn {
                                    dismiss()
                                }
                            }
                        },
                        isLoading: authViewModel.isLoading,
                        isDisabled: !isFormValid
                    )
                    .padding(.horizontal, AppSpacing.base)

                    Spacer()

                    // Login Link
                    HStack {
                        Text("Bạn đã có tài khoản?")
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)

                        Button(action: {}) {
                            Text("Đăng nhập")
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
        !name.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        passwordsMatch &&
        password.count >= 6
    }

    private var passwordsMatch: Bool {
        password == confirmPassword
    }
}
