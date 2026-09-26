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
    }

    var body: some View {

        VStack(alignment: .leading, spacing: 14) {

            HStack {

                Text("Khách sạn được yêu thích")
                    .font(.title3.weight(.bold))

                Spacer()

                NavigationLink {
                    ExploreHotelListView(hotels: popularHotels)
                } label: {
                    Text("Xem tất cả")
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(.blue)
            }

            LazyVStack(spacing: 16) {

                ForEach(popularHotels.prefix(5)) { hotel in

                    NavigationLink {
                        HotelDetailView(hotel: hotel)
                    } label: {
                        HotelExploreCard(hotel: hotel)
                    }
                    .buttonStyle(HotelCardPressStyle())
                    .accessibilityLabel("Xem \(hotel.name), \(hotel.city), \(hotel.ratingSummary)")
                    .overlay(alignment: .topTrailing) { FavoriteHotelButton(hotel: hotel).padding(12) }
                }
            }
        }
    }
}

struct ExploreHotelListView: View {
    let hotels: [Hotel]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                Text("\(hotels.count) khách sạn")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                ForEach(hotels) { hotel in
                    NavigationLink {
                        HotelDetailView(hotel: hotel)
                    } label: {
                        HotelExploreCard(hotel: hotel)
                    }
                    .buttonStyle(HotelCardPressStyle())
                    .accessibilityLabel("Xem \(hotel.name), \(hotel.city), \(hotel.ratingSummary)")
                    .overlay(alignment: .topTrailing) { FavoriteHotelButton(hotel: hotel).padding(12) }
                }
            }
            .padding(20)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Tất cả khách sạn")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
    }
}
