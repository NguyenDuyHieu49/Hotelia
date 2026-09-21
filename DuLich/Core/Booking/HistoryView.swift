import SwiftUI

struct HistoryView: View {
    @State private var bookings: [Booking] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedFilter: BookingFilter = .all

    enum BookingFilter: String, CaseIterable {
        case all = "Tất cả"
        case upcoming = "Sắp tới"
        case completed = "Đã xong"
        case cancelled = "Đã hủy"
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Tabs
                filterTabs

                // Content
                if isLoading {
                    LoadingView(message: "Đang tải lịch sử...")
                } else if let error = errorMessage {
                    ErrorView(message: error) {
                        Task { await loadBookings() }
                    }
                } else if filteredBookings.isEmpty {
                    EmptyStateView(
                        icon: "calendar.badge.exclamationmark",
                        title: "Chưa có đặt phòng",
                        message: "Bạn chưa có đặt phòng nào"
                    )
                } else {
                    bookingsList
                }
            }
            .background(AppColors.backgroundSecondary)
            .navigationTitle("Lịch sử đặt phòng")
            .task {
                await loadBookings()
            }
        }
    }

    // MARK: - Filter Tabs
    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.sm) {
                ForEach(BookingFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.rawValue,
                        isSelected: selectedFilter == filter,
                        action: { selectedFilter = filter }
                    )
                }
            }
            .padding(.horizontal, AppSpacing.base)
            .padding(.vertical, AppSpacing.md)
        }
        .background(Color.white)
    }

    // MARK: - Bookings List
    private var bookingsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.base) {
                ForEach(filteredBookings) { booking in
                    NavigationLink(destination: BookingDetailView(booking: booking)) {
                        BookingCard(booking: booking)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(AppSpacing.base)
        }
        .refreshable {
            await loadBookings()
        }
    }

    private var filteredBookings: [Booking] {
        switch selectedFilter {
        case .all:
            return bookings
        case .upcoming:
            return bookings.filter { $0.status == "CONFIRMED" || $0.status == "PENDING_PAYMENT" }
        case .completed:
            return bookings.filter { $0.status == "COMPLETED" || $0.status == "CHECKED_OUT" }
        case .cancelled:
            return bookings.filter { $0.status == "CANCELLED" || $0.status == "REFUNDED" }
        }
    }

    // MARK: - Actions
    private func loadBookings() async {
        isLoading = true
        errorMessage = nil

        do {
            bookings = try await BookingService.shared.getMyBookings()
        } catch {
            errorMessage = "Không thể tải lịch sử đặt phòng"
        }

        isLoading = false
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : AppColors.textPrimary)
                .padding(.horizontal, AppSpacing.base)
                .padding(.vertical, AppSpacing.sm)
                .background(isSelected ? AppColors.primary : AppColors.backgroundSecondary)
                .cornerRadius(AppSpacing.radiusFull)
        }
    }
}

// MARK: - Booking Card
struct BookingCard: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.base) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Mã đặt phòng")
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)

                    Text("#\(booking.id.prefix(8))")
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.textPrimary)
                }

                Spacer()

                StatusBadge(status: booking.status)
            }

            Divider()

            // Hotel Info
            HStack(spacing: AppSpacing.base) {
                // Placeholder Image
                RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                    .fill(AppColors.backgroundSecondary)
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: "building.2.fill")
                            .foregroundColor(AppColors.textTertiary)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(booking.hotelName ?? "Khách sạn")
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.textPrimary)

                    if let roomName = booking.roomTypeName {
                        Text(roomName)
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                Spacer()
            }

            Divider()

            // Dates & Price
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: AppSpacing.xs) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.primary)
                        Text(formatDateString(booking.checkIn))
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textPrimary)
                        Text("-")
                            .foregroundColor(AppColors.textSecondary)
                        Text(formatDateString(booking.checkOut))
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textPrimary)
                    }

                    Text("\(booking.nightsInt) đêm")
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatPrice(booking.totalPriceInt))
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.primary)

                    Text("Tổng cộng")
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }

    private func formatDateString(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "dd/MM"
            return formatter.string(from: date)
        }
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "dd/MM"
            return formatter.string(from: date)
        }
        return dateString
    }

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = ""
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}
