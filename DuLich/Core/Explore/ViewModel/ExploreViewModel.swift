import Foundation
import SwiftUI
import Combine

@MainActor
class ExploreViewModel: ObservableObject {
    @Published var hotels: [Hotel] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let exploreService = ExploreService.shared

    func loadHotels() async {
        isLoading = true
        errorMessage = nil

        do {
            hotels = try await exploreService.searchHotels()
        } catch {
            errorMessage = "Không thể tải danh sách khách sạn"
        }

        isLoading = false
    }

    func searchHotels(destination: String) async {
        isLoading = true
        errorMessage = nil

        do {
            hotels = try await exploreService.searchHotels(destination: destination)
        } catch {
            errorMessage = "Không thể tìm kiếm"
        }

        isLoading = false
    }
}
