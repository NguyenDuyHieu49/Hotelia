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
    let holdExpiresAt: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case userId, hotelId, roomTypeId, checkIn, checkOut
        case guestCount, guestName, guestEmail, guestPhone
        case specialRequests, roomPrice, totalPrice, nights
        case status, holdExpiresAt, createdAt, updatedAt
    }

    var statusDisplayName: String {
        switch status {
        case "PENDING_PAYMENT", "HELD": return "Chờ thanh toán"
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

    // Booking lifecycle states (from PDF)
    enum LifecycleStatus: String {
        case held = "HELD"           // Created, waiting for payment
        case pendingPayment = "PENDING_PAYMENT"
        case paid = "PAID"
        case confirmed = "CONFIRMED" // Payment successful
        case checkedIn = "CHECKED_IN"
        case checkedOut = "CHECKED_OUT"
        case completed = "COMPLETED"
        case cancelRequested = "CANCEL_REQUESTED"
        case cancelled = "CANCELLED"
        case refunded = "REFUNDED"
        case expired = "EXPIRED"

        var canCancel: Bool {
            switch self {
            case .held, .pendingPayment, .confirmed:
                return true
            default:
                return false
            }
        }

        var canConfirm: Bool {
            return self == .held || self == .pendingPayment
        }

        var isTerminal: Bool {
            switch self {
            case .completed, .cancelled, .refunded, .expired:
                return true
            default:
                return false
            }
        }
    }

    // Computed properties for UI
    var checkInDate: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: checkIn) {
            return date
        }
        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: checkIn) {
            return date
        }
        // Try simple date format
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = dateFormatter.date(from: checkIn) {
            return date
        }
        dateFormatter.dateFormat = "yyyy-MM-dd"
        return dateFormatter.date(from: checkIn) ?? Date()
    }

    var checkOutDate: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: checkOut) {
            return date
        }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: checkOut) {
            return date
        }
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = dateFormatter.date(from: checkOut) {
            return date
        }
        dateFormatter.dateFormat = "yyyy-MM-dd"
        return dateFormatter.date(from: checkOut) ?? Date()
    }

    var totalPriceInt: Int {
        return Int(totalPrice)
    }

    var guestCountInt: Int {
        return guestCount
    }

    var nightsInt: Int {
        return nights
    }

    // Extended properties for UI
    var hotelName: String? { return nil }
    var roomTypeName: String? { return nil }
}
