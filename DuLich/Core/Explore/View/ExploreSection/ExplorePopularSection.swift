//
//  ExplorePopularSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExplorePopularSection: View {

    let hotels: [Hotel]

    private var popularHotels: [Hotel] {

        hotels
            .sorted {
                ($0.averageRating ?? 0)
                >
                ($1.averageRating ?? 0)
            }
            .prefix(5)
            .map { $0 }
    }

    var body: some View {

        VStack(alignment: .leading, spacing: 14) {

            HStack {

                Text("Khách sạn được yêu thích")
                    .font(.title3.weight(.bold))

                Spacer()

                Button("Xem tất cả") {
                    // TODO
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(.blue)
            }

            LazyVStack(spacing: 16) {

                ForEach(popularHotels) { hotel in

                    HotelExploreCard(
                        hotel: hotel
                    )
                }
            }
        }
    }
}
