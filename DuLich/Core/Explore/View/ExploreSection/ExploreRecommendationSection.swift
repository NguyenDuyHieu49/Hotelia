//
//  ExploreRecommendationSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreRecommendationSection: View {

    let hotels: [Hotel]
    let isRanking: Bool
    let rankingInfo: String?

    private var bookableHotels: [Hotel] { hotels.filter { $0.isDemoCatalog != true } }
    private var recommendedHotels: [Hotel] { Array(bookableHotels.prefix(8)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            HStack(alignment: .center) {

                VStack(alignment: .leading, spacing: 5) {

                    HStack(spacing: 6) {

                        Image(systemName: "sparkles")
                            .foregroundStyle(.blue)

                        Text("Đề xuất cho bạn")
                            .font(.title3.weight(.bold))
                    }

                    Text(LocalizedStringKey(rankingInfo ?? "Khám phá khách sạn phù hợp với chuyến đi"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if isRanking {
                    ProgressView()
                } else {
                    NavigationLink("Xem tất cả") {
                        ExploreHotelListView(hotels: bookableHotels)
                    }
                    .font(.caption.weight(.semibold))
                }
            }

            if !recommendedHotels.isEmpty {

                ScrollView(
                    .horizontal,
                    showsIndicators: false
                ) {

                    HStack(spacing: 16) {

                        ForEach(
                            recommendedHotels
                        ) { hotel in

                            NavigationLink {
                                HotelDetailView(hotel: hotel)
                            } label: {
                                HotelRecommendationCard(hotel: hotel)
                            }
                            .buttonStyle(HotelCardPressStyle())
                            .accessibilityLabel("Xem \(hotel.name), \(hotel.city), \(hotel.accessibleRatingSummary)")
                            .overlay(alignment: .topTrailing) { FavoriteHotelButton(hotel: hotel).padding(12) }
                        }
                    }
                }
            }


        }
    }
}
