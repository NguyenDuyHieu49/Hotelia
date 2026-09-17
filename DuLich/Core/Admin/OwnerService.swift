import Foundation

class OwnerService {
    static let shared = OwnerService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Apply for Owner
    func applyOwner(businessName: String, businessLicense: String? = nil) async throws {
        var body: [String: Any] = ["businessName": businessName]
        if let license = businessLicense {
            body["businessLicense"] = license
        }

        _ = try await client.request(
            endpoint: "/owners/apply",
            method: "POST",
            body: body
        )
    }

    // MARK: - Get My Hotels
    func getMyHotels() async throws -> [Hotel] {
        return try await client.request(endpoint: "/hotels/owner/my-hotels")
    }

    // MARK: - Create Hotel
    func createHotel(
        name: String,
        description: String,
        address: String,
        city: String,
        district: String? = nil,
        starRating: Int,
        amenities: [String],
        latitude: Double? = nil,
        longitude: Double? = nil
    ) async throws -> Hotel {
        var body: [String: Any] = [
            "name": name,
            "description": description,
            "address": address,
            "city": city,
            "starRating": starRating,
            "amenities": amenities
        ]
        if let district = district { body["district"] = district }
        if let lat = latitude { body["latitude"] = lat }
        if let lng = longitude { body["longitude"] = lng }

        return try await client.request(
            endpoint: "/hotels",
            method: "POST",
            body: body
        )
    }

    // MARK: - Update Hotel
    func updateHotel(id: String, data: [String: Any]) async throws -> Hotel {
        return try await client.request(
            endpoint: "/hotels/\(id)",
            method: "PUT",
            body: data
        )
    }

    // MARK: - Delete Hotel
    func deleteHotel(id: String) async throws {
        _ = try await client.request(
            endpoint: "/hotels/\(id)",
            method: "DELETE"
        )
    }

    // MARK: - Submit Hotel for Approval
    func submitForApproval(hotelId: String) async throws -> Hotel {
        return try await client.request(
            endpoint: "/hotels/\(hotelId)/submit",
            method: "POST"
        )
    }
}
