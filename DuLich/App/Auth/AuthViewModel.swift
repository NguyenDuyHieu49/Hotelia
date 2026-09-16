import Foundation
import SwiftUI
import Combine

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService.shared

    init() {
        checkLoginStatus()
    }

    func checkLoginStatus() {
        isLoggedIn = authService.isLoggedIn()
        currentUser = authService.getCurrentUser()
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await authService.login(email: email, password: password)
            currentUser = response.user
            isLoggedIn = true
        } catch {
            errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra email và password."
        }

        isLoading = false
    }

    func register(email: String, password: String, name: String, phone: String?) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await authService.register(
                email: email,
                password: password,
                name: name,
                phone: phone
            )
            currentUser = response.user
            isLoggedIn = true
        } catch {
            errorMessage = "Đăng ký thất bại. Email có thể đã được sử dụng."
        }

        isLoading = false
    }

    func logout() {
        authService.logout()
        isLoggedIn = false
        currentUser = nil
    }
}
