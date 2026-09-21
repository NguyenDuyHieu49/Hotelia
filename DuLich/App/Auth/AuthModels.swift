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

    enum CodingKeys: String, CodingKey {
        case id
        case email, name, phone, avatar, role
    }
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
