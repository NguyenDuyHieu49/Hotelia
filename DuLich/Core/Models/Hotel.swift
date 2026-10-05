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
    let bookingEnabled: Bool?
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
        case isDemoCatalog, bookingEnabled
        case amenities, images, status, ownerId, checkInTime, checkOutTime
    }
}

// Keep API values unchanged for filtering and booking; only localize presentation.
enum HotelContentLocalization {
    static var isEnglish: Bool {
        AppLanguage.isEnglishSelected
    }

    static func city(_ value: String) -> String {
        guard isEnglish else { return value }
        let translated = L10n.text(value)
        return translated == value ? romanized(value) : translated
    }

    static func address(_ value: String) -> String {
        guard isEnglish else { return value }
        let translated = L10n.text(value)
        if translated != value { return translated }
        return value.split(separator: ",", omittingEmptySubsequences: false)
            .map { part in
                let component = part.trimmingCharacters(in: .whitespaces)
                if component.hasPrefix("Phường ") { return "\(romanized(String(component.dropFirst(7)))) Ward" }
                if component.hasPrefix("Quận ") { return "District \(romanized(String(component.dropFirst(5))))" }
                if component.hasPrefix("Đường ") { return "\(romanized(String(component.dropFirst(6)))) Street" }
                return city(component)
            }
            .joined(separator: ", ")
    }

    static func searchDestination(_ value: String) -> String {
        let key = romanized(value).lowercased().filter(\.isLetter)
        let aliases = [
            "hanoi": "Hà Nội", "hochiminhcity": "TP HCM", "hochiminh": "TP HCM",
            "hcmc": "TP HCM", "saigon": "TP HCM",
            "danang": "Đà Nẵng", "phuquoc": "Phú Quốc", "hoian": "Hội An",
            "halong": "Hạ Long", "hue": "Huế", "quynhon": "Quy Nhơn",
            "cantho": "Cần Thơ", "haiphong": "Hải Phòng", "langson": "Lạng Sơn"
        ]
        return aliases[key] ?? value
    }

    private static func romanized(_ value: String) -> String {
        value.replacingOccurrences(of: "Đ", with: "D")
            .replacingOccurrences(of: "đ", with: "d")
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "vi"))
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

extension Hotel {
    var localizedCity: String { HotelContentLocalization.city(city) }
    var localizedAddress: String { HotelContentLocalization.address(address) }
    var localizedDescription: String { L10n.text(description) }
}

extension RoomType {
    var localizedDescription: String? {
        guard let description, !description.isEmpty else { return nil }
        let marker = ". Ảnh từ website chính thức."
        guard let range = description.range(of: marker) else { return L10n.text(description) }
        let roomAndHotel = description[..<range.lowerBound]
        return "\(roomAndHotel). \(L10n.text("room_details_source_note"))"
    }
}

// Only reviews from completed stays contribute to the public guest score.
extension Hotel {
    var isBookingEnabled: Bool { bookingEnabled ?? (isDemoCatalog != true) }
    var bookingStatusText: String {
        L10n.text(isBookingEnabled ? "Đang nhận đặt phòng" : "Chưa mở đặt phòng trên Hotelia")
    }
    var bookingStatusExplanation: String {
        L10n.text(isDemoCatalog == true
            ? "Thông tin phòng và giá đang được cập nhật."
            : "Khách sạn chưa có loại phòng đang mở bán.")
    }
    var guestReviewCount: Int { guestRating == nil ? 0 : (reviewCount ?? 0) }
    var guestRating: Double? {
        guard (reviewCount ?? 0) > 0, let averageRating,
              averageRating.isFinite, averageRating > 0, averageRating <= 5 else { return nil }
        return averageRating
    }
    var ratingSummary: String {
        guard let rating = guestRating else { return L10n.text("Chưa có đánh giá từ khách lưu trú") }
        return L10n.format("hotel_rating_summary_format", rating, guestReviewCount)
    }
    var accessibleRatingSummary: String {
        ratingSummary
    }
}
