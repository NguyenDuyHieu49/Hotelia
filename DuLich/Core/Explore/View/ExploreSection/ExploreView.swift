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
        "Phú Quốc",
        "Hội An",
        "Hạ Long",
        "Huế",
        "Quy Nhơn"
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

                        ExploreDestinationBannerSection(onSelect: selectDestination)

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

                            ExplorePromotionSection(hotels: viewModel.hotels)

                            ExploreRankingSection(hotels: viewModel.hotels)

                            ExplorePopularSection(
                                hotels: viewModel.hotels
                            )

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
                destination: HotelContentLocalization.searchDestination(destination)
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

private struct ExploreDestinationBannerSection: View {
    let onSelect: (String) -> Void
    private let journeys: [(city: String, image: String, subtitle: String)] = [
        ("Hội An", "hoian1", "Phố cổ & những ngày chậm rãi"),
        ("Phú Quốc", "phuquoc1", "Một kỳ nghỉ bên biển"),
        ("Đà Nẵng", "DaNang3", "Biển, phố và những chuyến đi")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Đi đâu tiếp theo?")
                    .font(.system(size: 23, weight: .bold, design: .rounded))
                Spacer()
                Text("Vuốt để khám phá")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(journeys, id: \.city) { journey in
                        Button { onSelect(journey.city) } label: {
                            ZStack(alignment: .bottomLeading) {
                                Image(journey.image)
                                    .resizable().scaledToFill()
                                    .frame(width: 265, height: 178).clipped()
                                LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .center, endPoint: .bottom)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(LocalizedStringKey(journey.city)).font(.title2.weight(.bold))
                                    Text(LocalizedStringKey(journey.subtitle)).font(.caption)
                                }
                                .foregroundStyle(.white)
                                .padding(16)
                            }
                            .frame(width: 265, height: 178)
                            .clipShape(RoundedRectangle(cornerRadius: 19))
                        }
                        .buttonStyle(HotelCardPressStyle())
                        .accessibilityLabel(L10n.format("explore_destination_accessibility_format", HotelContentLocalization.city(journey.city)))
                    }
                }
            }
        }
    }
}

private struct ExploreRankingSection: View {
    let hotels: [Hotel]
    private var ranked: [Hotel] {
        Array(hotels.filter { $0.guestRating != nil }.sorted {
            if $0.guestRating != $1.guestRating {
                return ($0.guestRating ?? 0) > ($1.guestRating ?? 0)
            }
            return $0.name.localizedCompare($1.name) == .orderedAscending
        }.prefix(3))
    }

    var body: some View {
        if !ranked.isEmpty {
            VStack(alignment: .leading, spacing: 13) {
                HStack(spacing: 8) {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(Color(red: 0.11, green: 0.39, blue: 0.43))
                    Text("Xếp hạng theo đánh giá khách lưu trú")
                        .font(.title3.weight(.bold))
                }
                ForEach(Array(ranked.enumerated()), id: \.element.id) { index, hotel in
                    NavigationLink {
                        HotelDetailView(hotel: hotel)
                    } label: {
                        HStack(spacing: 12) {
                            Text(String(format: "%02d", index + 1))
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                                .foregroundStyle(Color(red: 0.11, green: 0.39, blue: 0.43))
                                .frame(width: 36)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(hotel.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                                Text(hotel.localizedCity).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 4)
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(String(format: "%.1f", hotel.guestRating ?? 0))
                                    .font(.headline.monospacedDigit())
                                Text("Điểm").font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        .foregroundStyle(.primary)
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 15))
                    }
                    .buttonStyle(HotelCardPressStyle())
                }
            }
        }
    }
}
