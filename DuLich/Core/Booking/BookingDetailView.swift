import SwiftUI

struct BookingDetailView: View {
    let booking: Booking
    @State private var isCancelling = false

    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                // Status Card
                statusCard

                // Hotel Info
                hotelInfoCard

                // Booking Details
                bookingDetailsCard

                // Guest Info
                guestInfoCard

                // Payment Summary
                paymentCard

                // Action Buttons
                actionButtons
            }
            .padding(AppSpacing.base)
        }
        .background(AppColors.backgroundSecondary)
        .navigationTitle("Chi tiết đặt phòng")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Status Card
    private var statusCard: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: statusIcon)
                .font(.system(size: 50))
                .foregroundColor(statusColor)

            Text(statusTitle)
                .font(AppTypography.title2)
                .foregroundColor(AppColors.textPrimary)

            Text(statusSubtitle)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.xl)
        .background(
            LinearGradient(
                colors: [statusColor.opacity(0.1), Color.white],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .cornerRadius(AppSpacing.radiusMedium)
    }

    private var statusIcon: String {
        switch booking.status {
        case "COMPLETED": return "checkmark.circle.fill"
        case "CONFIRMED": return "checkmark.seal.fill"
        case "PENDING_PAYMENT": return "clock.fill"
        case "CANCELLED": return "xmark.circle.fill"
        default: return "calendar"
        }
    }

    private var statusColor: Color {
        switch booking.status {
        case "COMPLETED", "CONFIRMED": return AppColors.success
        case "PENDING_PAYMENT": return AppColors.warning
        case "CANCELLED": return AppColors.error
        default: return AppColors.primary
        }
    }

    private var statusTitle: String {
        switch booking.status {
        case "COMPLETED": return "Hoàn thành"
        case "CONFIRMED": return "Đã xác nhận"
        case "PENDING_PAYMENT": return "Chờ thanh toán"
        case "CANCELLED": return "Đã hủy"
        default: return booking.status
        }
    }

    private var statusSubtitle: String {
        switch booking.status {
        case "COMPLETED": return "Cảm ơn bạn đã sử dụng dịch vụ!"
        case "CONFIRMED": return "Phòng của bạn đã được xác nhận"
        case "PENDING_PAYMENT": return "Vui lòng hoàn tất thanh toán"
        case "CANCELLED": return "Đặt phòng đã bị hủy"
        default: return ""
        }
    }

    // MARK: - Hotel Info Card
    private var hotelInfoCard: some View {
        HStack(spacing: AppSpacing.base) {
            // Hotel Image
            RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                .fill(AppColors.backgroundSecondary)
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 30))
                        .foregroundColor(AppColors.textTertiary)
                )

            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(booking.hotelName ?? "Khách sạn")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)

                if let roomName = booking.roomTypeName {
                    Text(roomName)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }

                HStack(spacing: AppSpacing.xxs) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                    Text("Mã: #\(booking.id.prefix(8))")
                        .font(AppTypography.caption1)
                }
                .foregroundColor(AppColors.textSecondary)
            }

            Spacer()
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Booking Details Card
    private var bookingDetailsCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.base) {
            Text("Chi tiết đặt phòng")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            DetailRow(icon: "calendar", title: "Ngày nhận phòng", value: formatDateString(booking.checkIn))
            DetailRow(icon: "calendar.badge.checkmark", title: "Ngày trả phòng", value: formatDateString(booking.checkOut))
            DetailRow(icon: "moon.fill", title: "Số đêm", value: "\(booking.nightsInt) đêm")
            DetailRow(icon: "person.2.fill", title: "Số khách", value: "\(booking.guestCountInt) khách")
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Guest Info Card
    private var guestInfoCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.base) {
            Text("Thông tin khách")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            DetailRow(icon: "person.fill", title: "Tên khách", value: booking.guestName)
            DetailRow(icon: "envelope.fill", title: "Email", value: booking.guestEmail)
            DetailRow(icon: "phone.fill", title: "Điện thoại", value: booking.guestPhone)

            if let requests = booking.specialRequests, !requests.isEmpty {
                DetailRow(icon: "text.bubble.fill", title: "Yêu cầu đặc biệt", value: requests)
            }
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Payment Card
    private var paymentCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.base) {
            Text("Thanh toán")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            HStack {
                Text("Giá phòng")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Text(formatPrice(booking.totalPriceInt))
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
            }

            Divider()

            HStack {
                Text("Tổng cộng")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                Spacer()
                Text(formatPrice(booking.totalPriceInt))
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.primary)
            }
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        VStack(spacing: AppSpacing.base) {
            // Cancel Button (only for pending bookings)
            if booking.status == "PENDING_PAYMENT" || booking.status == "CONFIRMED" {
                SecondaryButton(title: "Hủy đặt phòng", action: {
                    // Cancel action
                }, isDisabled: isCancelling)
            }

            // Contact Button
            PrimaryButton(title: "Liên hệ hỗ trợ", action: {
                // Contact action
            })
        }
    }

    // MARK: - Helpers
    private func formatDateString(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "EEEE, dd/MM/yyyy"
            return formatter.string(from: date)
        }
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "EEEE, dd/MM/yyyy"
            return formatter.string(from: date)
        }
        return dateString
    }

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "đ"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)đ"
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .foregroundColor(AppColors.primary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)

                Text(value)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
            }

            Spacer()
        }
    }
}
