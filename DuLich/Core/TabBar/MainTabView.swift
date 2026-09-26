import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Explore Tab
            ExploreView()
                .tabItem {
                    Label("Khám phá", systemImage: "magnifyingglass")
                }
                .tag(0)

            // Bookings Tab
            HistoryView()
                .tabItem {
                    Label("Đặt phòng", systemImage: "calendar")
                }
                .tag(1)

            if auth.currentUser?.role == "OWNER" {
                OwnerDashboardView().tabItem { Label("Quản lý", systemImage: "building.2") }.tag(3)
            }
            if auth.currentUser?.role == "ADMIN" {
                AdminDashboardView().tabItem { Label("Quản trị", systemImage: "checkmark.shield") }.tag(4)
            }

            // Profile Tab
            ProfileView()
                .tabItem {
                    Label("Tài khoản", systemImage: "person.fill")
                }
                .tag(2)
        }
        .tint(AppColors.primary)
    }
}
