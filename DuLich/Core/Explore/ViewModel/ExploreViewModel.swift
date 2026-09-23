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

    private let exploreService = ExploreService.shared
    private let recommendationService = RecommendationService.shared

    func loadHotels() async {
        isLoading = true
        isRanking = true
        errorMessage = nil
        rankingInfo = "Đang xếp hạng bằng AI..."

        do {
            // Check ML service health first
            if let health = try? await recommendationService.checkHealth() {
                rankingInfo = "ML: \(health.version)"

                // Search with ML ranking enabled
                hotels = try await exploreService.searchHotels(useMLRanking: true)
            } else {
                // Fallback: no ML ranking
                rankingInfo = "Popularity"
                hotels = try await exploreService.searchHotels(useMLRanking: false)
            }
        } catch {
            errorMessage = "Không thể tải danh sách khách sạn"
        }

        isLoading = false
        isRanking = false
    }

    func searchHotels(destination: String) async {
        isLoading = true
        isRanking = true
        errorMessage = nil
        rankingInfo = "Đang xếp hạng..."

        do {
            if let health = try? await recommendationService.checkHealth() {
                rankingInfo = "ML: \(health.version)"
                hotels = try await exploreService.searchHotels(destination: destination, useMLRanking: true)
            } else {
                rankingInfo = "Popularity"
                hotels = try await exploreService.searchHotels(destination: destination, useMLRanking: false)
            }
        } catch {
            errorMessage = "Không thể tìm kiếm"
        }

        isLoading = false
        isRanking = false
    }

    func refreshRanking() async {
        // Generate new session for fresh recommendations
        recommendationService.generateNewSession()
        await loadHotels()
    }
}
