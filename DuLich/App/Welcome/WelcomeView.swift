import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showLogin = false
    @State private var showRegister = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Spacer()

                // Logo
                VStack(spacing: 16) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text("Hotelia")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Đặt phòng khách sạn dễ dàng")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Buttons
                VStack(spacing: 12) {
                    Button(action: { showLogin = true }) {
                        Text("Đăng nhập")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }

                    Button(action: { showRegister = true }) {
                        Text("Đăng ký")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .foregroundColor(.primary)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal)

                Spacer()
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showLogin) {
                LoginView()
            }
            .sheet(isPresented: $showRegister) {
                RegisterView()
            }
        }
    }
}
