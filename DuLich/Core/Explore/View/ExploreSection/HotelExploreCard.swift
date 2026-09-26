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

                Text(hotel.name)
                    .font(.headline)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack(spacing: 8) {
                    Label(locationText, systemImage: "mappin.and.ellipse")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let rating = hotel.guestRating {
                        ratingView(rating)
                            .fixedSize(horizontal: true, vertical: false)
                    } else {
                        Text("Chưa có đánh giá")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                }

                if let amenities = hotel.amenities,
                   !amenities.isEmpty {

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {

                            ForEach(amenities.prefix(3), id: \.self) { amenity in

                                Text(amenity)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                    .padding(.horizontal, 9)
                                    .padding(.vertical, 6)
                                    .background(Color.gray.opacity(0.08))
                                    .clipShape(Capsule())
                            }
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

                    if let reviewCount = hotel.reviewCount, reviewCount > 0 {

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
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
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
            .frame(width: geometry.size.width, height: 220)
            .clipped()
        }
        .frame(height: 220)
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

struct HotelCardPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(RoundedRectangle(cornerRadius: 22))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
    }
}
