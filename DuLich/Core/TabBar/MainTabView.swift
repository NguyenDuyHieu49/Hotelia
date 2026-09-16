import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        TabView {
            ExploreView()
                .tabItem {
                    Label("Khám phá", systemImage: "magnifyingglass")
                }

            BookingHistoryView()
                .tabItem {
                    Label("Đặt phòng", systemImage: "calendar")
                }

            ProfileView()
                .tabItem {
                    Label("Tài khoản", systemImage: "person.circle")
                }
        }
    }
}
