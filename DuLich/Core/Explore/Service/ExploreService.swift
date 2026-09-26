import Foundation

class ExploreService {
    static let shared = ExploreService()
    private let client = APIClient.shared

    private init() {}

    // MARK: - Search Hotels
    func searchHotels(
        destination: String? = nil,
        minPrice: Int? = nil,
        maxPrice: Int? = nil,
        minRating: Int? = nil,
        page: Int = 1,
        limit: Int = 20,
        filters: HotelSearchFilters = HotelSearchFilters()
    ) async throws -> [Hotel] {
        var queryParams = "?"

        if let destination = destination, !destination.isEmpty {
            queryParams += "destination=\(destination.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? destination)&"
        }
        if let minPrice = minPrice {
            queryParams += "minPrice=\(minPrice)&"
        }
        if let maxPrice = maxPrice {
            queryParams += "maxPrice=\(maxPrice)&"
        }
        if let minRating = minRating {
            queryParams += "minRating=\(minRating)&"
        }
        queryParams += "page=\(page)&limit=\(limit)"

        var extras = URLComponents()
        extras.queryItems = filters.queryItems
        queryParams += "&" + (extras.percentEncodedQuery ?? "")

        let response: HotelsResponse = try await client.request(
            endpoint: "/hotels\(queryParams)"
        )

        return response.hotels
    }

    // MARK: - Get Hotel by ID
    func getHotel(id: String) async throws -> Hotel {
        return try await client.request(endpoint: "/hotels/\(id)")
    }

    // MARK: - Get Room Types by Hotel
    func getRoomTypes(hotelId: String, checkIn: String? = nil, checkOut: String? = nil) async throws -> [RoomType] {
        var endpoint = "/room-types/hotel/\(hotelId)"
        if let checkIn, let checkOut {
            endpoint += "?checkIn=\(checkIn)&checkOut=\(checkOut)"
        }
        return try await client.request(endpoint: endpoint)
    }
}
