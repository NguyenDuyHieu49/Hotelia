import Foundation

class AuthService {
    static let shared = AuthService()
    private let client = APIClient.shared

    private init() {}

    func login(email: String, password: String) async throws -> AuthResponse {
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]

        let response: AuthResponse = try await client.request(
            endpoint: "/auth/login",
            method: "POST",
            body: body
        )

        client.setAccessToken(response.accessToken)
        saveRefreshToken(response.refreshToken)
        saveUser(response.user)

        return response
    }

    func register(email: String, password: String, name: String, phone: String?) async throws -> AuthResponse {
        var body: [String: Any] = [
            "email": email,
            "password": password,
            "name": name
        ]
        if let phone = phone {
            body["phone"] = phone
        }

        let response: AuthResponse = try await client.request(
            endpoint: "/auth/register",
            method: "POST",
            body: body
        )

        client.setAccessToken(response.accessToken)
        saveRefreshToken(response.refreshToken)
        saveUser(response.user)

        return response
    }

    func logout() {
        client.clearToken()
        clearUserData()
    }

    func getCurrentUser() -> User? {
        guard let data = UserDefaults.standard.data(forKey: "currentUser") else {
            return nil
        }
        return try? JSONDecoder().decode(User.self, from: data)
    }

    func isLoggedIn() -> Bool {
        return UserDefaults.standard.string(forKey: "accessToken") != nil
    }

    private func saveRefreshToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: "refreshToken")
    }

    private func getRefreshToken() -> String? {
        return UserDefaults.standard.string(forKey: "refreshToken")
    }

    private func saveUser(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: "currentUser")
        }
    }

    private func clearUserData() {
        UserDefaults.standard.removeObject(forKey: "accessToken")
        UserDefaults.standard.removeObject(forKey: "refreshToken")
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }
}
