import SwiftUI

struct ExploreView: View {

    @StateObject private var viewModel = ExploreViewModel()

    @State private var searchText = ""
    @State private var selectedDestination = "Tất cả"

    private let destinations = [
        "Tất cả",
        "Hà Nội",
        "TP. Hồ Chí Minh",
        "Đà Nẵng",
        "Nha Trang",
        "Đà Lạt"
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
                            onSearch: performSearch
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
                        } else if let error = viewModel.errorMessage {
                            ExploreErrorSection(
                                message: error,
                                onRetry: {
                                    Task {
                                        await viewModel.loadHotels()
                                    }
                                }
                            )
                        } else if viewModel.hotels.isEmpty {
                            ExploreEmptySection()
                        } else {

                            ExploreRecommendationSection(
                                hotels: viewModel.hotels,
                                isRanking: viewModel.isRanking,
                                rankingInfo: viewModel.rankingInfo
                            )

                            ExplorePopularSection(
                                hotels: viewModel.hotels
                            )

                            ExplorePromotionSection()
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 40)
                }
                .refreshable {
                    await viewModel.refreshRanking()
                }
            }
            .navigationBarHidden(true)
        }
        .task {
            if viewModel.hotels.isEmpty {
                await viewModel.loadHotels()
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
