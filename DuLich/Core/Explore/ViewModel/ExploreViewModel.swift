import Foundation
import SwiftUI
import Combine

@MainActor
class ExploreViewModel: ObservableObject {
    @Published var hotels: [Hotel] = []
    @Published var isLoading = false
    @Published var isRanking = false
    @Published var errorMessage: String?
    @Published var rankingInfo: String?
    @Published var filters = HotelSearchFilters()
    private var destination: String?
    private var requestVersion = 0
    private let fetchRecommendations: (String?, HotelSearchFilters) async throws -> RecommendationResult
    private let fetchHotels: (String?, HotelSearchFilters) async throws -> [Hotel]

    init(
        fetchRecommendations: @escaping (String?, HotelSearchFilters) async throws -> RecommendationResult = {
            try await RecommendationService.shared.recommendations(destination: $0, filters: $1)
        },
        fetchHotels: @escaping (String?, HotelSearchFilters) async throws -> [Hotel] = {
            try await ExploreService.shared.searchHotels(destination: $0, filters: $1)
        }
    ) {
        self.fetchRecommendations = fetchRecommendations
        self.fetchHotels = fetchHotels
    }

    func loadHotels() async {
        if destination != nil { hotels = [] }
        destination = nil
        await reload()
    }

    func searchHotels(destination: String) async {
        if self.destination != destination { hotels = [] }
        self.destination = destination
        await reload()
    }

    func applyFilters(_ value: HotelSearchFilters) async {
        filters = value
        hotels = []
        await reload()
    }

    func refreshRanking() async {
        await reload()
    }

    func refreshFromGesture() async {
        // The refresh control can cancel its task when SwiftUI updates the scroll
        // content. Keep this user-requested fetch alive, and await it so the
        // spinner still reflects the actual request. requestVersion rejects stale results.
        let refresh = Task { await self.reload() }
        await refresh.value
    }

    private func isCancellation(_ error: Error) -> Bool {
        Task.isCancelled || error is CancellationError || (error as? URLError)?.code == .cancelled
    }

    private func reload() async {
        requestVersion += 1
        let version = requestVersion
        let requestedDestination = destination
        isLoading = hotels.isEmpty
        isRanking = true
        errorMessage = nil
        defer {
            if version == requestVersion {
                isLoading = false
                isRanking = false
            }
        }
        do {
            try Task.checkCancellation()
            let result = try await fetchRecommendations(requestedDestination, filters)
            try Task.checkCancellation()
            guard version == requestVersion else { return }
            hotels = result.hotels
            rankingInfo = result.ranking.description
        } catch {
            guard version == requestVersion, !isCancellation(error) else { return }
            // Keep browsing available if recommendation is unavailable.
            do {
                let fallback = try await fetchHotels(requestedDestination, filters)
                try Task.checkCancellation()
                guard version == requestVersion else { return }
                hotels = fallback
                rankingInfo = "Danh sách khách sạn — chưa áp dụng đề xuất cá nhân"
            } catch {
                guard version == requestVersion, !isCancellation(error) else { return }
                errorMessage = "Không thể tải khách sạn. Vui lòng thử lại."
            }
        }
    }
}
