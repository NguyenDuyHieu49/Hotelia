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
                        "Lựa chọn phù hợp dựa trên sở thích của bạn"
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

                            HotelRecommendationCard(
                                hotel: hotel
                            )
                        }
                    }
                }
            }

            #if DEBUG
            if let rankingInfo {
                Text(rankingInfo)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            #endif
        }
    }
}
