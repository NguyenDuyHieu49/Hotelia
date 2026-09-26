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

                if let rating = hotel.guestRating {
                    ratingBadge(rating)
                }


            }

            VStack(alignment: .leading, spacing: 5) {

                Text(hotel.name)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if hotel.guestRating == nil {
                    Text("Chưa có đánh giá")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 4) {

                    Image(systemName: "mappin.and.ellipse")

                    Text(locationText)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
        }
        .frame(width: 235, alignment: .leading)
    }

    private var hotelImage: some View {
        GeometryReader { geometry in
            Group {
                if let imageURL = hotel.images?.first,
                   let url = APIClient.shared.mediaURL(imageURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            placeholderImage.overlay { ProgressView() }
                        case .success(let image):
                            image.resizable().scaledToFill()
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
            .frame(width: geometry.size.width, height: 160)
            .clipped()
        }
        .frame(width: 235, height: 160)
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

    private var locationText: String {

        if let district = hotel.district,
           !district.isEmpty {
            return "\(district), \(hotel.city)"
        }

        return hotel.city
    }
}
