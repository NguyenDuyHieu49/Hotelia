import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showLogin = false
    @State private var showRegister = false
    @State private var animateLogo = false

    var body: some View {
        NavigationView {
            ZStack {
                // Background Gradient
                LinearGradient(
                    colors: [AppColors.backgroundPrimary, AppColors.backgroundSecondary],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: AppSpacing.xxl) {
                    Spacer()

                    // Logo Section
                    VStack(spacing: AppSpacing.lg) {
                        ZStack {
                            Circle()
                                .fill(AppColors.primary.opacity(0.1))
                                .frame(width: 160, height: 160)

                            Image(systemName: "building.2.fill")
                                .font(.system(size: 64))
                                .foregroundStyle(AppGradients.primary)
                                .scaleEffect(animateLogo ? 1.0 : 0.8)
                                .opacity(animateLogo ? 1 : 0)
                        }

                        VStack(spacing: AppSpacing.sm) {
                            Text("Hotelia")
                                .font(AppTypography.largeTitle)
                                .foregroundColor(AppColors.textPrimary)

                            Text("Đặt phòng khách sạn dễ dàng")
                                .font(AppTypography.subheadline)
                                .foregroundColor(AppColors.textSecondary)
                        }
                    }
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: animateLogo)

                    Spacer()

                    // Feature Highlights
                    VStack(spacing: AppSpacing.md) {
                        FeatureRow(icon: "magnifyingglass", title: "Khám phá", subtitle: "Tìm kiếm khách sạn hàng đầu")
                        FeatureRow(icon: "calendar", title: "Đặt phòng", subtitle: "Đặt nhanh chóng, dễ dàng")
                        FeatureRow(icon: "bell.badge", title: "Thông báo", subtitle: "Cập nhật lịch trình liên tục")
                    }
                    .padding(.horizontal, AppSpacing.xl)

                    Spacer()

                    // Buttons
                    VStack(spacing: AppSpacing.base) {
                        PrimaryButton(title: "Đăng nhập") {
                            showLogin = true
                        }

                        SecondaryButton(title: "Đăng ký") {
                            showRegister = true
                        }
                    }
                    .padding(.horizontal, AppSpacing.xl)
                    .padding(.bottom, AppSpacing.xxl)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showLogin) {
                LoginView()
                    .environmentObject(authViewModel)
            }
            .sheet(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(authViewModel)
            }
            .onAppear {
                animateLogo = true
            }
        }
    }
}

// MARK: - Feature Row
struct FeatureRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: AppSpacing.base) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(AppColors.primary)
                .frame(width: 44, height: 44)
                .background(AppColors.primary.opacity(0.1))
                .cornerRadius(AppSpacing.radiusMedium)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)
            }

            Spacer()
        }
    }
}
