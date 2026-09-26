import SwiftUI

struct RoomBookingView: View {
    let hotel: Hotel
    @Environment(\.hotelSearchFilters) private var searchFilters
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

                    if let reason = bookingBlockReason, errorMessage == nil {
                        Text(reason)
                            .font(AppTypography.subheadline)
                            .foregroundColor(AppColors.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
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
            .sheet(item: $bookingResult, onDismiss: { dismiss() }) { booking in
                NavigationStack { BookingDetailView(booking: booking).toolbar { Button("Đóng") { bookingResult = nil } } }
            }
            .onAppear {
                if let value = searchFilters.checkIn, let date = formatter.date(from: value) { checkIn = date }
                if let value = searchFilters.checkOut, let date = formatter.date(from: value) { checkOut = date }
                guestCount = searchFilters.guests
                if let user = AuthService.shared.getCurrentUser() {
                    guestName = user.name
                    guestEmail = user.email
                    guestPhone = user.phone ?? ""
                }
            }
            .task(id: stayKey) {
                errorMessage = nil
                await loadRoomTypes()
            }
            .onChange(of: checkIn) { _, newValue in
                if Calendar.current.startOfDay(for: checkOut) <= Calendar.current.startOfDay(for: newValue) {
                    checkOut = Calendar.current.date(byAdding: .day, value: 1, to: newValue) ?? newValue
                }
            }
            .onChange(of: guestCount) { _, _ in selectFirstBookableRoom() }
        }
    }

    // MARK: - Hotel Summary
    private var hotelSummary: some View {
        HStack(spacing: AppSpacing.base) {
            // Hotel Image
            if let images = hotel.images, !images.isEmpty {
                AsyncImage(url: APIClient.shared.mediaURL(images[0])) { image in
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

                if let rating = hotel.guestRating {
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
                    Text("Khách sạn chưa mở bán loại phòng nào")
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
                            guestCount: guestCount,
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
    private var formatter: DateFormatter {
        let value = DateFormatter()
        value.locale = Locale(identifier: "en_US_POSIX")
        value.dateFormat = "yyyy-MM-dd"
        return value
    }

    private var stayKey: String {
        "\(formatter.string(from: checkIn))|\(formatter.string(from: checkOut))"
    }

    private var isFormValid: Bool { bookingBlockReason == nil }

    private var bookingBlockReason: String? {
        if hotel.status != "PUBLISHED" { return "Khách sạn hiện chưa nhận đặt phòng." }
        if isLoading { return "Đang kiểm tra phòng trống theo ngày đã chọn." }
        if Calendar.current.startOfDay(for: checkOut) <= Calendar.current.startOfDay(for: checkIn) {
            return "Ngày trả phòng phải sau ngày nhận phòng."
        }
        if numberOfNights > 90 { return "Chỉ được đặt tối đa 90 đêm." }
        if roomTypes.isEmpty { return "Khách sạn chưa có loại phòng đang mở bán." }
        guard let room = selectedRoomType else {
            if roomTypes.allSatisfy({ $0.availableRooms == 0 }) { return "Đã hết phòng trong kỳ lưu trú đã chọn. Hãy đổi ngày." }
            return "Không có phòng phù hợp với \(guestCount) khách. Hãy giảm số khách hoặc chọn loại phòng khác."
        }
        if room.availableRooms < 1 { return "Loại phòng này đã hết trong kỳ lưu trú đã chọn." }
        if guestCount > room.maxGuests { return "Loại phòng này chỉ nhận tối đa \(room.maxGuests) khách." }
        if guestName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 { return "Vui lòng nhập họ và tên khách." }
        if !guestEmail.contains("@") { return "Vui lòng nhập email hợp lệ." }
        let phone = guestPhone.hasPrefix("+") ? String(guestPhone.dropFirst()) : guestPhone
        if !(10...15).contains(phone.count) || !phone.allSatisfy(\.isNumber) { return "Số điện thoại cần 10–15 chữ số." }
        return nil
    }

    private var numberOfNights: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: calendar.startOfDay(for: checkIn), to: calendar.startOfDay(for: checkOut))
        return max(1, components.day ?? 1)
    }

    // MARK: - Actions
    private func loadRoomTypes() async {
        isLoading = true
        do {
            let rooms = try await ExploreService.shared.getRoomTypes(hotelId: hotel.id,
                checkIn: formatter.string(from: checkIn), checkOut: formatter.string(from: checkOut))
            guard !Task.isCancelled else { return }
            roomTypes = rooms
            selectFirstBookableRoom()
        } catch {
            guard !Task.isCancelled else { return }
            roomTypes = []
            selectedRoomType = nil
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func selectFirstBookableRoom() {
        if let selected = selectedRoomType,
           let current = roomTypes.first(where: { $0.id == selected.id && $0.availableRooms > 0 && $0.maxGuests >= guestCount }) {
            selectedRoomType = current
        } else {
            selectedRoomType = roomTypes.first(where: { $0.availableRooms > 0 && $0.maxGuests >= guestCount })
        }
    }

    private func bookRoom() {
        guard let roomType = selectedRoomType else { return }

        isBooking = true
        errorMessage = nil

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
                // Show the created booking so the guest can confirm payment at hotel.
            } catch {
                errorMessage = error.localizedDescription
                await loadRoomTypes()
            }
            isBooking = false
        }
    }
}

// MARK: - Room Type Card
struct RoomTypeCard: View {
    let roomType: RoomType
    let isSelected: Bool
    let guestCount: Int
    let onSelect: () -> Void

    private var isBookable: Bool { roomType.availableRooms > 0 && guestCount <= roomType.maxGuests }

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 0) {
                // Room Image
                ZStack(alignment: .topTrailing) {
                    if let images = roomType.images, !images.isEmpty, let firstImage = images.first {
                        AsyncImage(url: APIClient.shared.mediaURL(firstImage)) { image in
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
                    Text(roomType.availableRooms == 0 ? "Hết phòng" : "\(roomType.availableRooms) phòng trống")
                        .font(AppTypography.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xxs)
                        .background(roomType.availableRooms == 0 ? AppColors.error : AppColors.success)
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

                    if guestCount > roomType.maxGuests {
                        Text("Không đủ sức chứa cho \(guestCount) khách")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.error)
                    }

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
        .disabled(!isBookable)
        .opacity(isBookable ? 1 : 0.7)
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
