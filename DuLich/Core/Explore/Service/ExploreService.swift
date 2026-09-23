import Foundation

class ExploreService {
    static let shared = ExploreService()
    private let client = APIClient.shared
    private let recommendationService = RecommendationService.shared

    private init() {}

    // MARK: - Search Hotels
    func searchHotels(
        destination: String? = nil,
        minPrice: Int? = nil,
        maxPrice: Int? = nil,
        minRating: Int? = nil,
        page: Int = 1,
        limit: Int = 20,
        useMLRanking: Bool = true
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

        let response: HotelsResponse = try await client.request(
            endpoint: "/hotels\(queryParams)"
        )

        var hotels = response.hotels

        // Apply ML Ranking if enabled
        if useMLRanking, !hotels.isEmpty {
            do {
                // Use first hotel's cityId as proxy (in real app, get from destination)
                let cityId = hotels.first?.id.hashValue ?? 1

                // Get ranked hotel IDs
                let rankedIds = try await recommendationService.rankHotels(
                    hotels: hotels,
                    cityId: cityId
                )

                // Reorder hotels based on ML ranking
                let hotelDict = Dictionary(uniqueKeysWithValues: hotels.map { ($0.id, $0) })
                hotels = rankedIds.compactMap { hotelDict[$0] }

                print("[ExploreService] Hotels reordered using ML ranking")
            } catch {
                print("[ExploreService] ML ranking failed, using default order: \(error)")
                // Fallback to popularity-based sorting
                hotels = recommendationService.getPopularityRanking(hotels: hotels)
            }
        }

        return hotels
    }

    // MARK: - Get Hotel by ID
    func getHotel(id: String) async throws -> Hotel {
        return try await client.request(endpoint: "/hotels/\(id)")
    }

    // MARK: - Get Room Types by Hotel
    func getRoomTypes(hotelId: String) async throws -> [RoomType] {
        return try await client.request(endpoint: "/room-types/hotel/\(hotelId)")
    }
}
