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

    func socialLogin(provider: String, idToken: String, name: String? = nil, nonce: String? = nil) async throws -> AuthResponse {
        var body: [String: Any] = ["provider": provider, "idToken": idToken]
        if let name { body["name"] = name }
        if let nonce { body["nonce"] = nonce }
        let response: AuthResponse = try await client.request(endpoint: "/auth/social", method: "POST", body: body)
        client.setAccessToken(response.accessToken)
        saveRefreshToken(response.refreshToken)
        saveUser(response.user)
        return response
    }

    func logout() {
        let refreshToken = SecureTokenStore.shared.value(for: .refresh)
        client.clearToken()
        clearUserData()
        // Revoke the session on the server too; signing out must not wait for the network.
        guard let refreshToken else { return }
        let client = self.client
        Task {
            try? await client.requestVoid(endpoint: "/auth/logout", body: ["refreshToken": refreshToken])
        }
    }

    func getCurrentUser() -> User? {
        guard let data = UserDefaults.standard.data(forKey: "currentUser") else {
            return nil
        }
        return try? JSONDecoder().decode(User.self, from: data)
    }

    func isLoggedIn() -> Bool {
        return SecureTokenStore.shared.value(for: .access) != nil
    }

    private func saveRefreshToken(_ token: String) {
        SecureTokenStore.shared.set(token, for: .refresh)
    }

    private func saveUser(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: "currentUser")
        }
    }

    private func clearUserData() {
        SecureTokenStore.shared.removeAll()
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }
}
