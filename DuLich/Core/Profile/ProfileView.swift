import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var route: AccountRoute?
    private enum AccountRoute: String, Identifiable {
        case profile, history, notifications, security, support, about, saved, applyOwner
        var id: String { rawValue }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Profile Header
                    profileHeader

                    // Menu Items
                    menuSection

                    // Logout Button
                    logoutButton
                }
                .padding(AppSpacing.base)
            }
            .background(AppColors.backgroundSecondary)
            .navigationTitle("Tài khoản")
            .sheet(item: $route) { item in
                NavigationStack {
                    Group {
                        switch item {
                        case .profile: EditProfileView()
                        case .history: HistoryView()
                        case .notifications: NotificationsView()
                        case .security: ChangePasswordView()
                        case .support: SupportView()
                        case .about: AboutHoteliaView()
                        case .saved: SavedHotelsView()
                        case .applyOwner: ApplyOwnerView()
                        }
                    }.toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { route = nil } } }
                }
            }
        }
    }

    // MARK: - Profile Header
    private var profileHeader: some View {
        VStack(spacing: AppSpacing.base) {
            // Avatar
            ZStack {
                Circle()
                    .fill(AppColors.primary.opacity(0.1))
                    .frame(width: 100, height: 100)

                if let user = authViewModel.currentUser {
                    Text(user.name.prefix(1).uppercased())
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(AppColors.primary)
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 40))
                        .foregroundColor(AppColors.primary)
                }
            }

            // User Info
            VStack(spacing: AppSpacing.xs) {
                Text(authViewModel.currentUser?.name ?? "User")
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.textPrimary)

                Text(authViewModel.currentUser?.email ?? "")
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
            }

            // Role Badge
            if let role = authViewModel.currentUser?.role {
                StatusBadge(status: role)
            }
        }
        .padding(.vertical, AppSpacing.lg)
    }

    // MARK: - Menu Section
    private var menuSection: some View {
        VStack(spacing: 0) {
            MenuItemView(icon: "heart.fill", title: "Khách sạn đã lưu", subtitle: "Danh sách yêu thích", action: { route = .saved })

            if authViewModel.currentUser?.role == "USER" {
                MenuItemView(icon: "building.2", title: "Trở thành đối tác", subtitle: "Đăng ký chủ khách sạn", action: { route = .applyOwner })
            }

            // Personal Info
            MenuItemView(
                icon: "person.fill",
                title: "Thông tin cá nhân",
                subtitle: "Cập nhật hồ sơ",
                action: { route = .profile }
            )

            Divider().padding(.leading, 56)

            // Bookings
            MenuItemView(
                icon: "calendar",
                title: "Lịch sử đặt phòng",
                subtitle: "Xem các đặt phòng của bạn",
                action: { route = .history }
            )

            Divider().padding(.leading, 56)

            // Notifications
            MenuItemView(
                icon: "bell.fill",
                title: "Thông báo",
                subtitle: "Xem thông báo của bạn",
                action: { route = .notifications }
            )

            Divider().padding(.leading, 56)

            // Security
            MenuItemView(
                icon: "lock.fill",
                title: "Bảo mật",
                subtitle: "Đổi mật khẩu",
                action: { route = .security }
            )

            Divider().padding(.leading, 56)

            // Help
            MenuItemView(
                icon: "questionmark.circle.fill",
                title: "Trợ giúp",
                subtitle: "Liên hệ hỗ trợ",
                action: { route = .support }
            )

            Divider().padding(.leading, 56)

            // About
            MenuItemView(
                icon: "info.circle.fill",
                title: "Về chúng tôi",
                subtitle: "Phiên bản 1.0.0",
                showDivider: false,
                action: { route = .about }
            )
        }
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
    }

    // MARK: - Logout Button
    private var logoutButton: some View {
        Button(action: logout) {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Đăng xuất")
            }
            .font(AppTypography.headline)
            .foregroundColor(AppColors.error)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.white)
            .cornerRadius(AppSpacing.radiusMedium)
        }
    }

    // MARK: - Actions
    private func logout() {
        authViewModel.logout()
    }
}

// MARK: - Menu Item View
struct MenuItemView: View {
    let icon: String
    let title: String
    let subtitle: String
    var showDivider: Bool = true
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.base) {
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.primary)
                    .frame(width: 40, height: 40)
                    .background(AppColors.primary.opacity(0.1))
                    .cornerRadius(AppSpacing.radiusSmall)

                // Content
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)

                    Text(subtitle)
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.textTertiary)
            }
            .padding(AppSpacing.base)
        }
    }
}
