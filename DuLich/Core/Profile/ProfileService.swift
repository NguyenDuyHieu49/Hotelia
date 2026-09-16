import Foundation

class ProfileService {
    static let shared = ProfileService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Get Profile
    func getProfile() async throws -> HotelUser {
        return try await client.request(endpoint: "/users/me")
    }

    // MARK: - Update Profile
    func updateProfile(name: String?, phone: String?, avatar: String?) async throws -> HotelUser {
        var body: [String: Any] = [:]
        if let name = name { body["name"] = name }
        if let phone = phone { body["phone"] = phone }
        if let avatar = avatar { body["avatar"] = avatar }

        return try await client.request(
            endpoint: "/users/me",
            method: "PUT",
            body: body
        )
    }
}
