import SwiftUI

struct HotelCoverImage: View {
    let hotel: Hotel
    let height: CGFloat

    private var destinationAsset: String {
        let city = hotel.city.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).lowercased()
        if city.contains("hoi an") { return "hoian1" }
        if city.contains("phu quoc") { return "phuquoc1" }
        if city.contains("da nang") { return "DaNang3" }
        if city.contains("nha trang") || city.contains("cam ranh") { return "nhatrang1" }
        if city.contains("ha long") || city.contains("hai phong") { return "HaLong2" }
        if city.contains("ha noi") { return "hanoi1" }
        if city.contains("hue") { return "hue1" }
        if city.contains("quy nhon") { return "quynhon1" }
        if city.contains("can tho") { return "cantho2" }
        return "Saigon1"
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                if let path = hotel.images?.first, let url = APIClient.shared.mediaURL(path) {
                    AsyncImage(url: url) { phase in
                        if case .success(let image) = phase {
                            image.resizable().scaledToFill()
                        } else {
                            destinationImage
                        }
                    }
                } else {
                    destinationImage
                }
                LinearGradient(colors: [.clear, .black.opacity(0.45)], startPoint: .center, endPoint: .bottom)
                if hotel.images?.first == nil || hotel.isDemoCatalog == true {
                    Text("Ảnh điểm đến")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.55), in: Capsule())
                        .padding(12)
                }
            }
            .frame(width: geometry.size.width, height: height)
            .clipped()
        }
        .frame(height: height)
        .accessibilityLabel(hotel.images?.first == nil ? "Ảnh điểm đến \(hotel.city)" : "Ảnh khách sạn \(hotel.name)")
    }

    private var destinationImage: some View {
        Image(destinationAsset).resizable().scaledToFill()
    }
}

struct HotelExploreCard: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HotelCoverImage(hotel: hotel, height: 182)
                .overlay(alignment: .topLeading) {
                    if hotel.isDemoCatalog == true {
                        Text("Đang cập nhật phòng")
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 10).padding(.vertical, 7)
                            .background(.regularMaterial, in: Capsule())
                            .padding(12)
                    }
                }
            VStack(alignment: .leading, spacing: 9) {
                Text(hotel.name)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 5) {
                    Image(systemName: "mappin")
                    Text(hotel.city).lineLimit(1)
                    Spacer(minLength: 8)
                    if let rating = hotel.displayRating {
                        Image(systemName: "star.fill").foregroundStyle(.orange)
                        Text(String(format: "%.1f", rating)).fontWeight(.semibold)
                    } else {
                        Text("Chưa có đánh giá")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                if hotel.displayReviewCount > 0 {
                    Text(L10n.format("hotel_reviews_count_format", hotel.displayReviewCount))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(15)
        }
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 20))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct HotelCardPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(RoundedRectangle(cornerRadius: 20))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
    }
}
