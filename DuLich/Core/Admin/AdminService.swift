import Foundation

class AdminService {
    static let shared = AdminService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Dashboard Stats
    func getStats() async throws -> AdminStats {
        return try await client.request(endpoint: "/admin/stats")
    }

    // MARK: - Pending Hotels
    func getPendingHotels() async throws -> [Hotel] {
        return try await client.request(endpoint: "/admin/hotels/pending")
    }

    // MARK: - Approve Hotel
    func approveHotel(id: String) async throws -> Hotel {
        return try await client.request(
            endpoint: "/admin/hotels/\(id)/approve",
            method: "POST"
        )
    }

    // MARK: - Reject Hotel
    func rejectHotel(id: String, reason: String) async throws -> Hotel {
        return try await client.request(
            endpoint: "/admin/hotels/\(id)/reject",
            method: "POST",
            body: ["reason": reason]
        )
    }

    // MARK: - Pending Owners
    func getPendingOwners() async throws -> [HotelUser] {
        return try await client.request(endpoint: "/admin/owners/pending")
    }

    // MARK: - Approve Owner
    func approveOwner(id: String) async throws -> HotelUser {
        return try await client.request(
            endpoint: "/admin/owners/\(id)/approve",
            method: "POST"
        )
    }
}
