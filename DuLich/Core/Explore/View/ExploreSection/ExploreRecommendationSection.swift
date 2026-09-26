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

    private var recommendedHotels: [Hotel] {
        Array(hotels.prefix(5))
    }

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

                    Text(
                        rankingInfo ?? "Khám phá khách sạn phù hợp với chuyến đi"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if isRanking {
                    ProgressView()
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
                            .accessibilityLabel("Xem \(hotel.name), \(hotel.city), \(hotel.ratingSummary)")
                            .overlay(alignment: .topTrailing) { FavoriteHotelButton(hotel: hotel).padding(12) }
                        }
                    }
                }
            }


        }
    }
}
