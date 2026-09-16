import Foundation

// MARK: - Review Models
struct Review: Codable, Identifiable {
    let id: String
    let hotelId: String
    let userId: String?
    let rating: Int
    let title: String?
    let content: String
    let helpfulCount: Int
    let isVisible: Bool
    let createdAt: String?
    let userName: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case hotelId, userId, rating, title, content
        case helpfulCount, isVisible, createdAt, userName
    }
}

struct ReviewsResponse: Decodable {
    let reviews: [Review]
    let total: Int
}
