import SwiftUI

struct MainTabView: View {
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
