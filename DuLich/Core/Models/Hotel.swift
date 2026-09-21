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
    let amenities: [String]?
    let images: [String]?
    let status: String?
    let ownerId: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, description, address, city, district, country
        case latitude, longitude, starRating, averageRating, reviewCount
        case amenities, images, status, ownerId
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
