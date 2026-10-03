import Foundation

// MARK: - Hotel Models
struct Hotel: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let address: String
    let city: String
    let district: String?
    let country: String?
    let latitude: Double?
    let longitude: Double?
    let starRating: Int?
    let averageRating: Double?
    let reviewCount: Int?
    let isDemoCatalog: Bool?
    let demoRating: Double?
    let demoReviewCount: Int?
    let demoReviews: [DemoHotelReview]?
    let amenities: [String]?
    let images: [String]?
    let status: String?
    let ownerId: String?
    let checkInTime: String?
    let checkOutTime: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, description, address, city, district, country
        case latitude, longitude, starRating, averageRating, reviewCount
        case isDemoCatalog, demoRating, demoReviewCount, demoReviews
        case amenities, images, status, ownerId, checkInTime, checkOutTime
    }
}

struct DemoHotelReview: Codable {
    let rating: Double
    let content: String

    var displayContent: String {
        let localized = L10n.text(content)
        let prefix = L10n.text("sample_comment_prefix")
        return localized.hasPrefix(prefix) ? String(localized.dropFirst(prefix.count)) : localized
    }
}

struct HotelsResponse: Decodable {
    let hotels: [Hotel]
    let total: Int
}

struct HotelUser: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let avatar: String?
    let role: String
    let ownerStatus: String?
    let businessName: String?
}

struct AdminStats: Codable {
    let users: Int
    let owners: Int
    let hotels: Int
    let bookings: Int
    let reviews: Int
}

// MARK: - Room Type Model
struct RoomType: Codable, Identifiable {
    let id: String
    let hotelId: String
    let name: String
    let description: String?
    let basePrice: Int
    let maxGuests: Int
    let totalRooms: Int
    let availableRooms: Int
    let amenities: [String]?
    let images: [String]?
    let isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case hotelId, name, description, basePrice, maxGuests
        case totalRooms, availableRooms, amenities, images, isActive
    }
}

// Zero with no reviews means unrated, not a guest score of zero.
extension Hotel {
    var displayRating: Double? { guestRating ?? demoRating }
    var displayReviewCount: Int { guestRating != nil ? (reviewCount ?? 0) : (demoReviews?.count ?? 0) }
    var guestRating: Double? {
        guard (reviewCount ?? 0) > 0, let averageRating,
              averageRating.isFinite, averageRating > 0, averageRating <= 5 else { return nil }
        return averageRating
    }
    var ratingSummary: String {
        guard let rating = displayRating else { return L10n.text("Chưa có đánh giá") }
        return L10n.format("hotel_rating_summary_format", rating, displayReviewCount)
    }
    var accessibleRatingSummary: String {
        ratingSummary
    }
}
