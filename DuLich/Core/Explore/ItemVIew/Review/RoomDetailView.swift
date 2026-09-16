import SwiftUI

struct RoomDetailView: View {
    let hotel: Hotel
    @State private var checkIn: Date = Date()
    @State private var checkOut: Date = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    @State private var guestCount: Int = 1
    @State private var isBooking = false
    @State private var bookingResult: Booking?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Hotel Info
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

                // Location
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.red)
                    Text("\(hotel.address), \(hotel.city)")
                }
                .foregroundColor(.secondary)

                Divider()

                // Room Selection
                VStack(alignment: .leading, spacing: 12) {
                    Text("Chọn ngày")
                        .font(.headline)

                    DatePicker("Nhận phòng", selection: $checkIn, in: Date()..., displayedComponents: .date)
                    DatePicker("Trả phòng", selection: $checkOut, in: checkIn..., displayedComponents: .date)

                    Stepper("Khách: \(guestCount)", value: $guestCount, in: 1...10)
                }

                // Amenities
                if let amenities = hotel.amenities, !amenities.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tiện ích")
                            .font(.headline)

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
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
                }

                if let error = errorMessage {
                    Text(error).foregroundColor(.red)
                }

                // Book Button
                Button(action: bookRoom) {
                    HStack {
                        if isBooking {
                            ProgressView()
                                .tint(.white)
                        }
                        Text("Đặt phòng")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isBooking)
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func bookRoom() {
        isBooking = true
        errorMessage = nil

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        Task {
            do {
                let guest = AuthService.shared.getCurrentUser()
                bookingResult = try await BookingService.shared.createBooking(
                    hotelId: hotel.id,
                    roomTypeId: "default",
                    checkIn: dateFormatter.string(from: checkIn),
                    checkOut: dateFormatter.string(from: checkOut),
                    guestCount: guestCount,
                    guestName: guest?.name ?? "Guest",
                    guestEmail: guest?.email ?? "guest@test.com",
                    guestPhone: guest?.phone ?? "0000000000"
                )
            } catch {
                errorMessage = "Không thể đặt phòng"
            }
            isBooking = false
        }
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
