import Foundation

struct RecommendationMetadata: Decodable {
    let mode: String
    let personalized: Bool
    let description: String
    let modelUsed: Bool
}
struct RecommendationResult: Decodable {
    let hotels: [Hotel]
    let total: Int
    let ranking: RecommendationMetadata
}

final class RecommendationService {
    static let shared = RecommendationService()
    private let client = APIClient.shared
    // Anonymous history lasts for this app process; signed-in history belongs to JWT user.
    private let sessionId = UUID().uuidString
    private init() {}

    func recommendations(destination: String?, filters: HotelSearchFilters = HotelSearchFilters()) async throws -> RecommendationResult {
        var query = URLComponents()
        query.queryItems = [URLQueryItem(name: "sessionId", value: sessionId),
                           URLQueryItem(name: "limit", value: "20")]
        query.queryItems?.append(contentsOf: filters.queryItems)
        if let destination, !destination.isEmpty {
            query.queryItems?.append(URLQueryItem(name: "destination", value: destination))
        }
        return try await client.request(endpoint: "/recommendations?\(query.percentEncodedQuery ?? "")")
    }

    func recordView(hotelId: String) async {
        // Analytics failure must never block hotel details or booking.
        try? await client.requestVoid(endpoint: "/recommendations/views", body: [
            "sessionId": sessionId, "hotelId": hotelId
        ])
    }
}
