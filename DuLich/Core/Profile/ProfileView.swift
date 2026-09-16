import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationView {
            List {
                // User Info
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(authViewModel.currentUser?.name ?? "User")
                                .font(.headline)
                            Text(authViewModel.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Menu
                Section("Tài khoản") {
                    NavigationLink(destination: EditProfileView()) {
                        Label("Chỉnh sửa thông tin", systemImage: "pencil")
                    }

                    NavigationLink(destination: ChangePasswordView()) {
                        Label("Đổi mật khẩu", systemImage: "lock")
                    }
                }

                Section("Đặt phòng") {
                    NavigationLink(destination: BookingHistoryView()) {
                        Label("Lịch sử đặt phòng", systemImage: "calendar")
                    }

                    NavigationLink(destination: FavoriteView()) {
                        Label("Khách sạn yêu thích", systemImage: "heart")
                    }
                }

                Section("Hỗ trợ") {
                    NavigationLink(destination: HelpView()) {
                        Label("Trợ giúp", systemImage: "questionmark.circle")
                    }

                    NavigationLink(destination: AboutView()) {
                        Label("Giới thiệu", systemImage: "info.circle")
                    }
                }

                Section {
                    Button(role: .destructive, action: { showLogoutAlert = true }) {
                        Label("Đăng xuất", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Tài khoản")
            .alert("Đăng xuất", isPresented: $showLogoutAlert) {
                Button("Hủy", role: .cancel) { }
                Button("Đăng xuất", role: .destructive) {
                    authViewModel.logout()
                }
            } message: {
                Text("Bạn có chắc muốn đăng xuất?")
            }
        }
    }
}

// Placeholder Views
struct EditProfileView: View {
    var body: some View {
        Text("Chỉnh sửa thông tin")
            .navigationTitle("Chỉnh sửa")
    }
}

struct ChangePasswordView: View {
    var body: some View {
        Text("Đổi mật khẩu")
            .navigationTitle("Đổi mật khẩu")
    }
}

struct FavoriteView: View {
    var body: some View {
        Text("Khách sạn yêu thích")
            .navigationTitle("Yêu thích")
    }
}

struct HelpView: View {
    var body: some View {
        Text("Trợ giúp")
            .navigationTitle("Trợ giúp")
    }
}

struct AboutView: View {
    var body: some View {
        VStack {
            Image(systemName: "building.2.fill")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            Text("Hotelia")
                .font(.title)
                .fontWeight(.bold)
            Text("Version 1.0.0")
                .foregroundColor(.secondary)
        }
        .navigationTitle("Giới thiệu")
    }
}
