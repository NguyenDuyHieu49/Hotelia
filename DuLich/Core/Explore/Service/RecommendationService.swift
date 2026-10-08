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

struct RecommendationImpression {
    let id: String
    let candidateIds: [String]
    let destination: String?
    let filters: HotelSearchFilters
}

final class RecommendationService {
    static let shared = RecommendationService()
    private let client = APIClient.shared
    // Anonymous history lasts for this app process; signed-in history belongs to JWT user.
    private let sessionId = UUID().uuidString
    private init() {}

    func recommendations(destination: String?, filters: HotelSearchFilters) async throws -> RecommendationResult {
        var query = URLComponents()
        query.queryItems = [URLQueryItem(name: "sessionId", value: sessionId),
                           URLQueryItem(name: "limit", value: "100")]
        query.queryItems?.append(contentsOf: filters.queryItems)
        if let destination, !destination.isEmpty {
            query.queryItems?.append(URLQueryItem(name: "destination", value: destination))
        }
        return try await client.request(endpoint: "/recommendations?\(query.percentEncodedQuery ?? "")")
    }

    func recordImpression(_ impression: RecommendationImpression) async -> Bool {
        guard !impression.candidateIds.isEmpty else { return false }
        var body: [String: Any] = [
            "sessionId": sessionId,
            "impressionId": impression.id,
            "candidateIds": impression.candidateIds
        ]
        if let destination = impression.destination, !destination.isEmpty {
            body["destination"] = destination
        }
        if let checkIn = impression.filters.checkIn { body["checkIn"] = checkIn }
        if let checkOut = impression.filters.checkOut { body["checkOut"] = checkOut }
        if impression.filters.guests > 1 || impression.filters.checkIn != nil ||
            impression.filters.checkOut != nil || impression.filters.minPrice != nil ||
            impression.filters.maxPrice != nil {
            body["guests"] = impression.filters.guests
        }
        if let minPrice = impression.filters.minPrice { body["minPrice"] = minPrice }
        if let maxPrice = impression.filters.maxPrice { body["maxPrice"] = maxPrice }
        if let minRating = impression.filters.minRating { body["minRating"] = minRating }
        do {
            try await client.requestVoid(endpoint: "/recommendations/impressions", body: body)
            return true
        } catch {
            return false
        }
    }

    func recordView(hotelId: String, impression: RecommendationImpression? = nil) async {
        // Analytics failure must never block hotel details or booking.
        var body: [String: Any] = [
            "sessionId": sessionId, "hotelId": hotelId
        ]
        if let impression, impression.candidateIds.contains(hotelId),
           await recordImpression(impression) {
            // The impression POST is idempotent, so retrying here also handles a fast tap.
            body["impressionId"] = impression.id
        }
        try? await client.requestVoid(endpoint: "/recommendations/views", body: body)
    }
}
