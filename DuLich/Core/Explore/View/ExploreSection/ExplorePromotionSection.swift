import SwiftUI

struct ExplorePromotionSection: View {
    let hotels: [Hotel]

    var body: some View {
        NavigationLink {
            ExploreHotelListView(hotels: hotels)
        } label: {
            ZStack(alignment: .bottomLeading) {
                Image("hue1")
                    .resizable().scaledToFill()
                    .frame(height: 190).clipped()
                LinearGradient(colors: [.clear, .black.opacity(0.78)], startPoint: .top, endPoint: .bottom)
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("BỘ SƯU TẬP HOTELIA")
                            .font(.caption2.weight(.bold))
                            .tracking(1.5)
                        Text("Một nơi ở, nhiều hành trình")
                            .font(.system(size: 21, weight: .bold, design: .rounded))
                        Text(L10n.format("explore_all_hotels_format", hotels.count))
                            .font(.caption)
                    }
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.headline)
                        .frame(width: 38, height: 38)
                        .background(.white.opacity(0.23), in: Circle())
                }
                .foregroundStyle(.white)
                .padding(18)
            }
            .frame(height: 190)
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(HotelCardPressStyle())
    }
}
