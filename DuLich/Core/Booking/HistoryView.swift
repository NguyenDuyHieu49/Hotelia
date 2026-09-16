import SwiftUI

struct BookingHistoryView: View {
    @State private var bookings: [Booking] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Đang tải...")
            } else if let error = errorMessage {
                VStack {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    Text(error)
                        .foregroundColor(.red)
                }
            } else if bookings.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    Text("Chưa có đặt phòng nào")
                        .foregroundColor(.secondary)
                }
            } else {
                List(bookings) { booking in
                    NavigationLink(destination: BookingDetailView(booking: booking)) {
                        BookingRowView(booking: booking)
                    }
                }
            }
        }
        .navigationTitle("Lịch sử đặt phòng")
        .refreshable {
            await loadBookings()
        }
        .task {
            await loadBookings()
        }
    }

    private func loadBookings() async {
        isLoading = true
        errorMessage = nil

        do {
            bookings = try await BookingService.shared.getMyBookings()
        } catch {
            errorMessage = "Không thể tải danh sách"
        }

        isLoading = false
    }
}

struct BookingRowView: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("#\(booking.id.prefix(8))")
                    .font(.headline)
                Spacer()
                StatusBadge(status: booking.status)
            }

            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.blue)
                Text("\(booking.checkIn) - \(booking.checkOut)")
                    .font(.subheadline)
            }

            HStack {
                Image(systemName: "person")
                    .foregroundColor(.green)
                Text(booking.guestName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("\(booking.nights) đêm")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(Int(booking.totalPrice)) VND")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }
        }
        .padding(.vertical, 4)
    }
}

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(statusText)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }

    var statusText: String {
        switch status {
        case "PENDING_PAYMENT": return "Chờ thanh toán"
        case "PAID": return "Đã thanh toán"
        case "CONFIRMED": return "Đã xác nhận"
        case "CHECKED_IN": return "Đã nhận phòng"
        case "CHECKED_OUT": return "Đã trả phòng"
        case "COMPLETED": return "Hoàn thành"
        case "CANCELLED": return "Đã hủy"
        case "REFUNDED": return "Đã hoàn tiền"
        default: return status
        }
    }

    var statusColor: Color {
        switch status {
        case "COMPLETED": return .green
        case "CANCELLED", "REFUNDED": return .red
        case "PENDING_PAYMENT": return .orange
        case "PAID", "CONFIRMED": return .blue
        default: return .gray
        }
    }
}
