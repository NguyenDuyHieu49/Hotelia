import SwiftUI

struct ExploreView: View {

    @StateObject private var viewModel = ExploreViewModel()

    @State private var showFilters = false
    @State private var searchText = ""
    @State private var selectedDestination = "Tất cả"

    private let destinations = [
        "Tất cả",
        "Hà Nội",
        "TP. Hồ Chí Minh",
        "Đà Nẵng",
        "Nha Trang",
        "Phú Quốc"
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 28) {

                        ExploreHeaderSection()

                        ExploreSearchSection(
                            searchText: $searchText,
                            filters: viewModel.filters,
                            onSearch: performSearch,
                            onFilter: { showFilters = true }
                        )

                        ExploreDestinationSection(
                            destinations: destinations,
                            selectedDestination: $selectedDestination,
                            onSelect: selectDestination
                        )

                        if viewModel.isLoading {
                            ExploreLoadingSection(
                                isRanking: viewModel.isRanking
                            )
                        }

                        if let error = viewModel.errorMessage {
                            ExploreErrorSection(
                                message: error,
                                onRetry: {
                                    Task {
                                        await viewModel.refreshRanking()
                                    }
                                }
                            )
                        }

                        if !viewModel.isLoading && viewModel.hotels.isEmpty && viewModel.errorMessage == nil {
                            ExploreEmptySection()
                        } else if !viewModel.hotels.isEmpty {

                            ExploreRecommendationSection(
                                hotels: viewModel.hotels,
                                isRanking: viewModel.isRanking,
                                rankingInfo: viewModel.rankingInfo
                            )

                            ExplorePopularSection(
                                hotels: viewModel.hotels
                            )

                            ExplorePromotionSection(hotels: viewModel.hotels)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.refreshFromGesture()
                }
            }
            .environment(\.hotelSearchFilters, viewModel.filters)
            .sheet(isPresented: $showFilters) {
                ExploreFiltersView(filters: viewModel.filters) { filters in
                    Task { await viewModel.applyFilters(filters) }
                }
            }
            .navigationBarHidden(true)
            .task {
                await viewModel.refreshRanking()
                try? await FavoritesStore.shared.load()
            }
        }
    }
}

// MARK: - Actions

private extension ExploreView {

    func performSearch() {
        let destination = searchText
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !destination.isEmpty else {
            Task {
                await viewModel.loadHotels()
            }
            return
        }

        Task {
            await viewModel.searchHotels(
                destination: destination
            )
        }
    }

    func selectDestination(_ destination: String) {
        selectedDestination = destination
        searchText = ""

        Task {
            if destination == "Tất cả" {
                await viewModel.loadHotels()
            } else {
                await viewModel.searchHotels(
                    destination: destination
                )
            }
        }
    }
}
