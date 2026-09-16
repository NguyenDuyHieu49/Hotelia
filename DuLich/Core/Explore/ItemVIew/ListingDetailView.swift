import SwiftUI

struct HotelDetailView: View {
    let hotel: Hotel
    @State private var showBooking = false
    @State private var reviews: [Review] = []
    @State private var isLoadingReviews = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Image
                ZStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 250)

                    Image(systemName: "building.2.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.gray)
                }

                VStack(alignment: .leading, spacing: 16) {
                    // Name & Rating
                    HStack {
                        VStack(alignment: .leading) {
                            Text(hotel.name)
                                .font(.title)
                                .fontWeight(.bold)

                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", hotel.averageRating ?? 0))
                                Text("(\(hotel.reviewCount ?? 0) đánh giá)")
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        if let stars = hotel.starRating {
                            VStack {
                                Text("\(stars)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("sao")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    // Location
                    HStack {
                        Image(systemName: "location.fill")
                            .foregroundColor(.red)
                        Text("\(hotel.address), \(hotel.city)")
                    }
                    .foregroundColor(.secondary)

                    Divider()

                    // Description
                    Text("Mô tả")
                        .font(.headline)
                    Text(hotel.description)

                    // Amenities
                    if let amenities = hotel.amenities, !amenities.isEmpty {
                        Divider()
                        Text("Tiện ích")
                            .font(.headline)

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 8) {
                            ForEach(amenities, id: \.self) { amenity in
                                HStack {
                                    Image(systemName: amenityIcon(amenity))
                                    Text(amenity)
                                        .font(.caption)
                                }
                                .padding(6)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                    }

                    Divider()

                    // Reviews
                    Text("Đánh giá")
                        .font(.headline)

                    if isLoadingReviews {
                        ProgressView()
                    } else if reviews.isEmpty {
                        Text("Chưa có đánh giá nào")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(reviews.prefix(3)) { review in
                            ReviewCardItemView(review: review)
                        }
                    }

                    // Book Button
                    Button(action: { showBooking = true }) {
                        Text("Đặt phòng ngay")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showBooking) {
            RoomBookingView(hotel: hotel)
        }
        .task {
            await loadReviews()
        }
    }

    private func loadReviews() async {
        do {
            let response = try await ReviewService.shared.getReviews(hotelId: hotel.id)
            reviews = response.reviews
        } catch {
            // Silent fail
        }
        isLoadingReviews = false
    }

    private func amenityIcon(_ amenity: String) -> String {
        switch amenity.lowercased() {
        case "wifi": return "wifi"
        case "pool": return "figure.pool.swim"
        case "parking": return "car.fill"
        case "spa": return "sparkles"
        case "restaurant": return "fork.knife"
        case "gym": return "dumbbell.fill"
        default: return "checkmark.circle"
        }
    }
}
