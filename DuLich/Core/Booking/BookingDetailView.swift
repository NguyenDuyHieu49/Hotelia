import SwiftUI

struct BookingDetailView: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Booking #\(booking.id.prefix(8))")
                    .font(.headline)
                Spacer()
                Text(booking.statusDisplayName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor)
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }

            Divider()

            // Details
            Group {
                DetailRow(title: "Check-in", value: booking.checkIn)
                DetailRow(title: "Check-out", value: booking.checkOut)
                DetailRow(title: "Khách", value: booking.guestName)
                DetailRow(title: "Email", value: booking.guestEmail)
                DetailRow(title: "Điện thoại", value: booking.guestPhone)
                DetailRow(title: "Số đêm", value: "\(booking.nights)")
                DetailRow(title: "Tổng tiền", value: "\(Int(booking.totalPrice)) VND")
            }
        }
        .padding()
    }

    var statusColor: Color {
        switch booking.status {
        case "COMPLETED": return .green
        case "CANCELLED", "REFUNDED": return .red
        case "PENDING_PAYMENT": return .orange
        default: return .blue
        }
    }
}

struct DetailRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title).foregroundColor(.secondary)
            Spacer()
            Text(value)
        }
    }
}
