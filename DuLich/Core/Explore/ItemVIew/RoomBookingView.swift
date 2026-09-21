import SwiftUI

struct RoomBookingView: View {
    let hotel: Hotel
    @Environment(\.dismiss) private var dismiss

    @State private var roomTypes: [RoomType] = []
    @State private var selectedRoomType: RoomType?
    @State private var checkIn: Date = Date()
    @State private var checkOut: Date = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    @State private var guestCount: Int = 1
    @State private var guestName: String = ""
    @State private var guestEmail: String = ""
    @State private var guestPhone: String = ""
    @State private var specialRequests: String = ""
    @State private var isLoading = true
    @State private var isBooking = false
    @State private var bookingResult: Booking?
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Hotel Summary
                    hotelSummary

                    // Room Type Selection
                    roomTypeSection

                    // Date Selection
                    dateSection

                    // Guest Information
                    guestInfoSection

                    // Special Requests
                    specialRequestsSection

                    // Error Message
                    if let error = errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(AppColors.error)
                            Text(error)
                                .font(AppTypography.subheadline)
                                .foregroundColor(AppColors.error)
                        }
                        .padding(AppSpacing.base)
                        .background(AppColors.error.opacity(0.1))
                        .cornerRadius(AppSpacing.radiusSmall)
                    }

                    // Book Button
                    PrimaryButton(
                        title: "Xác nhận đặt phòng",
                        action: bookRoom,
                        isLoading: isBooking,
                        isDisabled: !isFormValid
                    )
                    .padding(.top, AppSpacing.base)
                }
                .padding(AppSpacing.base)
            }
            .background(AppColors.backgroundSecondary)
            .navigationTitle("Đặt phòng")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .foregroundColor(AppColors.textPrimary)
                    }
                }
            }
            .task {
                await loadRoomTypes()
            }
            .onAppear {
                if let user = AuthService.shared.getCurrentUser() {
                    guestName = user.name
                    guestEmail = user.email
                    guestPhone = user.phone ?? ""
                }
            }
        }
    }

    // MARK: - Hotel Summary
    private var hotelSummary: some View {
        HStack(spacing: AppSpacing.base) {
            // Hotel Image
            if let images = hotel.images, !images.isEmpty {
                AsyncImage(url: URL(string: images[0])) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(AppColors.backgroundSecondary)
                        .overlay(
                            Image(systemName: "building.2.fill")
                                .foregroundColor(AppColors.textTertiary)
                        )
                }
                .frame(width: 80, height: 80)
                .cornerRadius(AppSpacing.radiusSmall)
            }

            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Text(hotel.name)
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(2)

                HStack(spacing: AppSpacing.xxs) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.locationRed)
                    Text(hotel.city)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }

                if let rating = hotel.averageRating {
                    HStack(spacing: AppSpacing.xxs) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.starYellow)
                        Text(String(format: "%.1f", rating))
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textPrimary)
                    }
                }
            }

            Spacer()
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Room Type Selection
    private var roomTypeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("Chọn loại phòng")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            if isLoading {
                HStack {
                    ProgressView()
                    Text("Đang tải loại phòng...")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.xl)
            } else if roomTypes.isEmpty {
                VStack(spacing: AppSpacing.sm) {
                    Image(systemName: "bed.double")
                        .font(.system(size: 40))
                        .foregroundColor(AppColors.textTertiary)
                    Text("Không có phòng trống")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.xl)
            } else {
                VStack(spacing: AppSpacing.sm) {
                    ForEach(roomTypes) { roomType in
                        RoomTypeCard(
                            roomType: roomType,
                            isSelected: selectedRoomType?.id == roomType.id,
                            onSelect: { selectedRoomType = roomType }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Date Selection
    private var dateSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("Chọn ngày")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            HStack(spacing: AppSpacing.base) {
                // Check In
                DatePicker(
                    "Nhận phòng",
                    selection: $checkIn,
                    in: Date()...,
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .labelsHidden()
                .padding(AppSpacing.base)
                .background(Color.white)
                .cornerRadius(AppSpacing.radiusSmall)

                Image(systemName: "arrow.right")
                    .foregroundColor(AppColors.textTertiary)

                // Check Out
                DatePicker(
                    "Trả phòng",
                    selection: $checkOut,
                    in: checkIn...,
                    displayedComponents: .date
                )
                .datePickerStyle(.compact)
                .labelsHidden()
                .padding(AppSpacing.base)
                .background(Color.white)
                .cornerRadius(AppSpacing.radiusSmall)
            }

            // Guest Count
            HStack {
                Text("Số khách")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)

                Spacer()

                HStack(spacing: AppSpacing.base) {
                    Button(action: { if guestCount > 1 { guestCount -= 1 } }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(guestCount > 1 ? AppColors.primary : AppColors.textTertiary)
                    }

                    Text("\(guestCount)")
                        .font(AppTypography.headline)
                        .frame(width: 30)

                    Button(action: { if guestCount < 10 { guestCount += 1 } }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(guestCount < 10 ? AppColors.primary : AppColors.textTertiary)
                    }
                }
            }
            .padding(AppSpacing.base)
            .background(Color.white)
            .cornerRadius(AppSpacing.radiusSmall)
        }
    }

    // MARK: - Guest Information
    private var guestInfoSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("Thông tin khách")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            VStack(spacing: AppSpacing.base) {
                AppTextField(
                    placeholder: "Họ và tên",
                    text: $guestName,
                    icon: "person"
                )

                AppTextField(
                    placeholder: "Email",
                    text: $guestEmail,
                    icon: "envelope",
                    keyboardType: .emailAddress
                )

                AppTextField(
                    placeholder: "Số điện thoại",
                    text: $guestPhone,
                    icon: "phone",
                    keyboardType: .phonePad
                )
            }
        }
    }

    // MARK: - Special Requests
    private var specialRequestsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("Yêu cầu đặc biệt")
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)

            TextEditor(text: $specialRequests)
                .font(AppTypography.body)
                .frame(height: 100)
                .padding(AppSpacing.sm)
                .background(Color.white)
                .cornerRadius(AppSpacing.radiusSmall)
                .overlay(
                    RoundedRectangle(cornerRadius: AppSpacing.radiusSmall)
                        .stroke(AppColors.border, lineWidth: 1)
                )

            Text("Không bắt buộc. Chúng tôi sẽ cố gắng đáp ứng các yêu cầu của bạn.")
                .font(AppTypography.caption1)
                .foregroundColor(AppColors.textSecondary)
        }
    }

    // MARK: - Computed Properties
    private var isFormValid: Bool {
        selectedRoomType != nil &&
        !guestName.isEmpty &&
        !guestEmail.isEmpty &&
        !guestPhone.isEmpty &&
        guestPhone.count >= 10
    }

    private var numberOfNights: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: checkIn, to: checkOut)
        return max(1, components.day ?? 1)
    }

    // MARK: - Actions
    private func loadRoomTypes() async {
        isLoading = true
        do {
            roomTypes = try await ExploreService.shared.getRoomTypes(hotelId: hotel.id)
            if let first = roomTypes.first {
                selectedRoomType = first
            }
        } catch {
            errorMessage = "Không thể tải loại phòng"
        }
        isLoading = false
    }

    private func bookRoom() {
        guard let roomType = selectedRoomType else { return }

        isBooking = true
        errorMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        Task {
            do {
                bookingResult = try await BookingService.shared.createBooking(
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    checkIn: formatter.string(from: checkIn),
                    checkOut: formatter.string(from: checkOut),
                    guestCount: guestCount,
                    guestName: guestName,
                    guestEmail: guestEmail,
                    guestPhone: guestPhone,
                    specialRequests: specialRequests.isEmpty ? nil : specialRequests
                )
                dismiss()
            } catch {
                errorMessage = "Không thể đặt phòng. Vui lòng thử lại."
            }
            isBooking = false
        }
    }
}

// MARK: - Room Type Card
struct RoomTypeCard: View {
    let roomType: RoomType
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 0) {
                // Room Image
                ZStack(alignment: .topTrailing) {
                    if let images = roomType.images, !images.isEmpty, let firstImage = images.first {
                        AsyncImage(url: URL(string: firstImage)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            roomImagePlaceholder
                        }
                    } else {
                        roomImagePlaceholder
                    }

                    // Availability Badge
                    Text("\(roomType.availableRooms) phòng")
                        .font(AppTypography.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(AppColors.success)
                        .cornerRadius(AppSpacing.radiusSmall)
                        .padding(AppSpacing.sm)
                }
                .frame(height: 140)
                .clipped()

                // Info Section
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text(roomType.name)
                        .font(AppTypography.headline)
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    HStack(spacing: AppSpacing.md) {
                        HStack(spacing: AppSpacing.xxs) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 12))
                            Text("\(roomType.maxGuests) khách")
                        }

                        if let description = roomType.description, !description.isEmpty {
                            Text("•")
                            Text(description.prefix(30) + (description.count > 30 ? "..." : ""))
                        }
                    }
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)

                    // Amenities Horizontal Scroll
                    if let amenities = roomType.amenities, !amenities.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: AppSpacing.xs) {
                                ForEach(amenities.prefix(5), id: \.self) { amenity in
                                    AmenityBadge(amenity: amenity)
                                }
                            }
                        }
                    }

                    // Price
                    HStack {
                        Text(formatPrice(roomType.basePrice))
                            .font(AppTypography.title3)
                            .foregroundColor(AppColors.primary)

                        Text("/đêm")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)

                        Spacer()

                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(AppColors.success)
                        } else {
                            Image(systemName: "circle")
                                .font(.system(size: 24))
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }
                }
                .padding(AppSpacing.base)
            }
            .background(isSelected ? AppColors.primary.opacity(0.05) : Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isSelected ? AppColors.primary : AppColors.border, lineWidth: isSelected ? 2 : 1)
            )
            .cornerRadius(AppSpacing.radiusMedium)
        }
        .buttonStyle(.plain)
    }

    private var roomImagePlaceholder: some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [AppColors.backgroundTertiary, AppColors.backgroundSecondary],
                startPoint: .top,
                endPoint: .bottom
            ))
            .overlay(
                Image(systemName: "bed.double.fill")
                    .font(.system(size: 30))
                    .foregroundColor(AppColors.textTertiary)
            )
    }

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = ""
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}
