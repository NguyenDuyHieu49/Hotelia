import Foundation

class ReviewService {
    static let shared = ReviewService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Get Reviews for Hotel
    func getReviews(hotelId: String, page: Int = 1, limit: Int = 20) async throws -> ReviewsResponse {
        return try await client.request(
            endpoint: "/reviews/hotel/\(hotelId)?page=\(page)&limit=\(limit)"
        )
    }

    // MARK: - Create Review
    func createReview(
        hotelId: String,
        rating: Int,
        content: String,
        title: String? = nil,
        bookingId: String? = nil
    ) async throws -> Review {
        var body: [String: Any] = [
            "hotelId": hotelId,
            "rating": rating,
            "content": content
        ]
        if let title = title {
            body["title"] = title
        }
        if let bookingId = bookingId {
            body["bookingId"] = bookingId
        }

        return try await client.request(
            endpoint: "/reviews",
            method: "POST",
            body: body
        )
    }

    // MARK: - Get My Reviews
    func getMyReviews() async throws -> [Review] {
        return try await client.request(endpoint: "/reviews/my-reviews")
    }
}
