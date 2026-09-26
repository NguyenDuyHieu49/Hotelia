import SwiftUI

struct PasswordRecoveryView: View {
    @State private var email = ""
    @State private var code = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var message: String?
    @State private var busy = false
    var body: some View {
        Form {
            Section("Nhận mã khôi phục qua email") {
                TextField("Email đã đăng ký", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                Button("Gửi mã") { requestCode() }.disabled(busy || !email.contains("@"))
            }
            Section("Đặt mật khẩu mới") {
                TextField("Mã trong email", text: $code).textInputAutocapitalization(.never).autocorrectionDisabled()
                SecureField("Mật khẩu mới (ít nhất 8 ký tự)", text: $password)
                SecureField("Nhập lại mật khẩu", text: $confirm)
                Button("Đặt lại mật khẩu") { reset() }.disabled(busy || code.count < 20 || password.count < 8 || password != confirm)
            }
            if busy { ProgressView() }
            if let message { Text(message) }
        }.navigationTitle("Quên mật khẩu")
    }
    private func requestCode() {
        busy = true
        Task {
            do {
                try await APIClient.shared.requestVoid(endpoint: "/auth/forgot-password", body: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines)])
                message = "Nếu email đã đăng ký, bạn sẽ nhận được mã có hiệu lực trong 15 phút."
            } catch { message = error.localizedDescription }
            busy = false
        }
    }
    private func reset() {
        busy = true
        Task {
            do {
                try await APIClient.shared.requestVoid(endpoint: "/auth/reset-password", body: ["code": code.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
                code = ""; password = ""; confirm = ""; message = "Đã đặt lại mật khẩu. Quay lại đăng nhập để tiếp tục."
            } catch { message = error.localizedDescription }
            busy = false
        }
    }
}
