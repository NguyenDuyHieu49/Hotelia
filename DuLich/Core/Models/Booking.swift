import Foundation

// MARK: - Booking Models
struct Booking: Codable, Identifiable {
    let id: String
    let userId: String
    let hotelId: String
    let roomTypeId: String
    let checkIn: String
    let checkOut: String
    let guestCount: Int
    let guestName: String
    let guestEmail: String
    let guestPhone: String
    let specialRequests: String?
    let roomPrice: Double
    let totalPrice: Double
    let nights: Int
    let status: String
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case userId, hotelId, roomTypeId, checkIn, checkOut
        case guestCount, guestName, guestEmail, guestPhone
        case specialRequests, roomPrice, totalPrice, nights
        case status, createdAt
    }

    var statusDisplayName: String {
        switch status {
        case "PENDING_PAYMENT": return "Chờ thanh toán"
        case "PAID": return "Đã thanh toán"
        case "CONFIRMED": return "Đã xác nhận"
        case "CHECKED_IN": return "Đã nhận phòng"
        case "CHECKED_OUT": return "Đã trả phòng"
        case "COMPLETED": return "Hoàn thành"
        case "CANCEL_REQUESTED": return "Yêu cầu hủy"
        case "CANCELLED": return "Đã hủy"
        case "REFUNDED": return "Đã hoàn tiền"
        case "EXPIRED": return "Hết hạn"
        default: return status
        }
    }
}
