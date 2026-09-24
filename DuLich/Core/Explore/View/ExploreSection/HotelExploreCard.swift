//
//  HotelExploreCard.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct HotelExploreCard: View {

    let hotel: Hotel

    var body: some View {

        VStack(alignment: .leading, spacing: 0) {

            imageSection

            VStack(
                alignment: .leading,
                spacing: 10
            ) {

                HStack(
                    alignment: .top
                ) {

                    VStack(
                        alignment: .leading,
                        spacing: 5
                    ) {

                        Text(hotel.name)
                            .font(.headline)
                            .lineLimit(2)

                        HStack(spacing: 5) {

                            Image(
                                systemName:
                                    "mappin.and.ellipse"
                            )

                            Text(locationText)
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if let rating = hotel.averageRating {
                        ratingView(rating)
                    }
                }

                if let amenities = hotel.amenities,
                   !amenities.isEmpty {

                    HStack(spacing: 8) {

                        ForEach(
                            amenities.prefix(3),
                            id: \.self
                        ) { amenity in

                            Text(amenity)
                                .font(.caption2)
                                .foregroundStyle(
                                    .secondary
                                )
                                .padding(
                                    .horizontal,
                                    9
                                )
                                .padding(
                                    .vertical,
                                    6
                                )
                                .background(
                                    Color.gray.opacity(
                                        0.08
                                    )
                                )
                                .clipShape(
                                    Capsule()
                                )
                        }
                    }
                }

                HStack {

                    if let stars = hotel.starRating {

                        HStack(spacing: 3) {

                            ForEach(
                                0..<stars,
                                id: \.self
                            ) { _ in

                                Image(
                                    systemName:
                                        "star.fill"
                                )
                                .font(.caption2)
                                .foregroundStyle(
                                    .orange
                                )
                            }
                        }
                    }

                    Spacer()

                    if let reviewCount =
                        hotel.reviewCount {

                        Text(
                            "\(reviewCount) đánh giá"
                        )
                        .font(.caption)
                        .foregroundStyle(
                            .secondary
                        )
                    }
                }
            }
            .padding(16)
        }
        .background(.white)
        .clipShape(
            RoundedRectangle(
                cornerRadius: 22
            )
        )
        .shadow(
            color: .black.opacity(0.06),
            radius: 15,
            y: 6
        )
    }

    private var imageSection: some View {

        ZStack(alignment: .topTrailing) {

            Group {

                if let imageURL =
                    hotel.images?.first,
                   let url = URL(
                    string: imageURL
                   ) {

                    AsyncImage(
                        url: url
                    ) { phase in

                        switch phase {

                        case .empty:
                            ProgressView()
                                .frame(
                                    maxWidth: .infinity
                                )

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
            .frame(
                maxWidth: .infinity,
                minHeight: 220,
                maxHeight: 220
            )
            .clipped()

            Button {
                // TODO: Favorite
            } label: {

                Image(
                    systemName: "heart"
                )
                .font(
                    .system(
                        size: 17,
                        weight: .semibold
                    )
                )
                .foregroundStyle(.primary)
                .frame(
                    width: 42,
                    height: 42
                )
                .background(
                    .white.opacity(0.92)
                )
                .clipShape(Circle())
            }
            .padding(14)
        }
    }

    private var placeholderImage: some View {

        ZStack {

            Color.gray.opacity(0.1)

            Image(
                systemName: "photo"
            )
            .font(.system(size: 35))
            .foregroundStyle(
                .secondary
            )
        }
    }

    private var locationText: String {

        if let district =
            hotel.district,
           !district.isEmpty {

            return "\(district), \(hotel.city)"
        }

        return hotel.city
    }

    private func ratingView(
        _ rating: Double
    ) -> some View {

        HStack(spacing: 4) {

            Image(
                systemName: "star.fill"
            )
            .font(.caption)

            Text(
                String(
                    format: "%.1f",
                    rating
                )
            )
            .font(
                .caption.weight(
                    .bold
                )
            )
        }
        .foregroundStyle(.orange)
        .padding(
            .horizontal,
            9
        )
        .padding(
            .vertical,
            7
        )
        .background(
            Color.orange.opacity(
                0.1
            )
        )
        .clipShape(
            Capsule()
        )
    }
}
