import SwiftUI

struct HotelRecommendationCard: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HotelCoverImage(hotel: hotel, height: 158)
                .frame(width: 240)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(alignment: .topLeading) {
                    if let rating = hotel.guestRating {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill").foregroundStyle(.yellow)
                            Text(String(format: "%.1f", rating)).fontWeight(.bold)
                        }
                        .font(.caption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 7)
                        .background(.black.opacity(0.65), in: Capsule())
                        .padding(10)
                    }
                }
            Text(hotel.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            Label(hotel.localizedCity, systemImage: "mappin")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(width: 240, alignment: .leading)
    }
}
