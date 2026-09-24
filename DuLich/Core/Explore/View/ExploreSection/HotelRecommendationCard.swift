//
//  HotelRecommendationCard.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct HotelRecommendationCard: View {

    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            ZStack(alignment: .bottomLeading) {

                hotelImage

                if let rating = hotel.averageRating {
                    ratingBadge(rating)
                }

                favoriteButton
            }

            VStack(alignment: .leading, spacing: 5) {

                Text(hotel.name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)

                HStack(spacing: 4) {

                    Image(systemName: "mappin.and.ellipse")

                    Text(locationText)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
        }
        .frame(width: 235)
    }

    private var hotelImage: some View {
        Group {
            if let imageURL = hotel.images?.first,
               let url = URL(string: imageURL) {

                AsyncImage(url: url) { phase in
                    switch phase {

                    case .empty:
                        ProgressView()

                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()

                    case .failure:
                        placeholderImage

                    @unknown default:
                        placeholderImage
                    }
                }

            } else {
                placeholderImage
            }
        }
        .frame(width: 235, height: 160)
        .clipped()
        .clipShape(
            RoundedRectangle(cornerRadius: 20)
        )
    }

    private var placeholderImage: some View {
        ZStack {
            Color.gray.opacity(0.1)

            Image(systemName: "photo")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
        }
    }

    private func ratingBadge(
        _ rating: Double
    ) -> some View {

        HStack(spacing: 4) {

            Image(systemName: "star.fill")
                .font(.caption2)

            Text(
                String(format: "%.1f", rating)
            )
            .font(.caption.weight(.bold))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(.black.opacity(0.7))
        .clipShape(Capsule())
        .padding(10)
    }

    private var favoriteButton: some View {
        VStack {
            HStack {
                Spacer()

                Button {
                    // TODO: Favorite
                } label: {
                    Image(systemName: "heart")
                        .font(
                            .system(
                                size: 16,
                                weight: .semibold
                            )
                        )
                        .foregroundStyle(.primary)
                        .frame(
                            width: 38,
                            height: 38
                        )
                        .background(
                            .white.opacity(0.92)
                        )
                        .clipShape(Circle())
                }
                .padding(10)
            }

            Spacer()
        }
    }

    private var locationText: String {

        if let district = hotel.district,
           !district.isEmpty {
            return "\(district), \(hotel.city)"
        }

        return hotel.city
    }
}
