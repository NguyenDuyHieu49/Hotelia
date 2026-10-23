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
        NavigationStack {
            ZStack {
                AppColors.backgroundSecondary
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    header
                    filterTabs

                    Group {
                        if isLoading {
                            LoadingView(message: "Đang tải lịch sử...")
                        } else if let error = errorMessage {
                            ErrorView(message: error) {
                                Task { await loadBookings() }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else if filteredBookings.isEmpty {
                            emptyBookingsState
                        } else {
                            bookingsList
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .toolbar(.hidden, for: .navigationBar)
            .task {
                await loadBookings()
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: AppSpacing.md) {
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text("Lịch sử đặt phòng")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(AppColors.textPrimary)

                Text("booking_history_subtitle")
                    .font(AppTypography.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(2)
            }

            Spacer(minLength: AppSpacing.sm)

            ZStack {
                Circle()
                    .fill(AppColors.primary.opacity(0.12))
                Image(systemName: "calendar")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(AppColors.primary)
            }
            .frame(width: 48, height: 48)
            .accessibilityHidden(true)
        }
        .padding(.horizontal, AppSpacing.lg)
        .padding(.top, AppSpacing.base)
        .padding(.bottom, AppSpacing.lg)
        .background(AppColors.backgroundPrimary)
    }

    // MARK: - Filter Tabs
    private var filterTabs: some View {
        HStack(spacing: AppSpacing.sm) {
            ForEach(BookingFilter.allCases, id: \.self) { filter in
                FilterChip(
                    title: filter.rawValue,
                    isSelected: selectedFilter == filter,
                    action: {
                        withAnimation(.easeOut(duration: 0.18)) {
                            selectedFilter = filter
                        }
                    }
                )
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.md)
        .background(AppColors.backgroundPrimary)
    }

    private var emptyBookingsState: some View {
        ScrollView {
            VStack(spacing: AppSpacing.lg) {
                ZStack {
                    RoundedRectangle(cornerRadius: AppSpacing.radiusLarge)
                        .fill(AppColors.primary.opacity(0.10))
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 42, weight: .medium))
                        .foregroundStyle(AppColors.primary)
                }
                .frame(width: 88, height: 88)

                VStack(spacing: AppSpacing.sm) {
                    Text(selectedFilter == .all ? "Chưa có đặt phòng" : "booking_filter_empty_title")
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(AppColors.textPrimary)

                    Text(selectedFilter == .all ? "Bạn chưa có đặt phòng nào" : "booking_filter_empty_message")
                        .font(AppTypography.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, AppSpacing.xxl)
            .padding(.vertical, AppSpacing.massive)
            .background(AppColors.backgroundPrimary, in: RoundedRectangle(cornerRadius: AppSpacing.radiusXLarge))
            .padding(AppSpacing.lg)
        }
        .refreshable {
            await loadBookings()
        }
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
            errorMessage = L10n.text("Không thể tải lịch sử đặt phòng")
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
            Text(LocalizedStringKey(title))
                .font(.system(size: 13, weight: isSelected ? .semibold : .medium))
                .foregroundColor(isSelected ? .white : AppColors.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(isSelected ? AppColors.primary : AppColors.backgroundSecondary, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Booking Card
struct BookingCard: View {
    let booking: Booking
    @State private var hotel: Hotel?

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
                Group {
                    if let hotel {
                        HotelCoverImage(hotel: hotel, height: 60)
                            .frame(width: 60, height: 60)
                            .clipped()
                    } else {
                        RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                            .fill(AppColors.backgroundSecondary)
                            .overlay {
                                Image(systemName: "building.2.fill")
                                    .foregroundColor(AppColors.textTertiary)
                            }
                            .frame(width: 60, height: 60)
                    }
                }
                .frame(width: 60, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: AppSpacing.radiusSmall))

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

                    Text(L10n.format(booking.nightsInt == 1 ? "night_count_one_format" : "nights_count_format", booking.nightsInt))
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
        .task(id: booking.hotelId) {
            hotel = try? await ExploreService.shared.getHotel(id: booking.hotelId)
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = AppLanguage.selected.locale
        formatter.dateFormat = "dd/MM"
        return formatter.string(from: date)
    }

    private func formatDateString(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = AppLanguage.selected.locale
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
        formatter.locale = AppLanguage.selected.locale
        formatter.numberStyle = .currency
        formatter.currencySymbol = ""
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}
