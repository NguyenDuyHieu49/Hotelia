import Foundation

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct AuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let user: User
}

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let avatar: String?
    let role: String
}

struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let name: String
    let phone: String?
}

struct RefreshRequest: Encodable {
    let refreshToken: String
}
