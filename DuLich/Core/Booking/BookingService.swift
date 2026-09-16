import Foundation

class BookingService {
    static let shared = BookingService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Create Booking
    func createBooking(
        hotelId: String,
        roomTypeId: String,
        checkIn: String,
        checkOut: String,
        guestCount: Int,
        guestName: String,
        guestEmail: String,
        guestPhone: String,
        specialRequests: String? = nil
    ) async throws -> Booking {
        var body: [String: Any] = [
            "hotelId": hotelId,
            "roomTypeId": roomTypeId,
            "checkIn": checkIn,
            "checkOut": checkOut,
            "guestCount": guestCount,
            "guestName": guestName,
            "guestEmail": guestEmail,
            "guestPhone": guestPhone
        ]
        if let requests = specialRequests {
            body["specialRequests"] = requests
        }

        return try await client.request(
            endpoint: "/bookings",
            method: "POST",
            body: body
        )
    }

    // MARK: - Get My Bookings
    func getMyBookings() async throws -> [Booking] {
        return try await client.request(endpoint: "/bookings")
    }

    // MARK: - Get Booking by ID
    func getBooking(id: String) async throws -> Booking {
        return try await client.request(endpoint: "/bookings/\(id)")
    }

    // MARK: - Cancel Booking
    func cancelBooking(id: String, reason: String? = nil) async throws -> Booking {
        var body: [String: Any] = [:]
        if let reason = reason {
            body["reason"] = reason
        }

        return try await client.request(
            endpoint: "/bookings/\(id)/cancel",
            method: "POST",
            body: body
        )
    }
}
