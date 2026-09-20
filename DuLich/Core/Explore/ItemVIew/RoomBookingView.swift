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
            Form {
                Section("Khách sạn") {
                    Text(hotel.name)
                        .font(.headline)
                }

                Section("Loại phòng") {
                    if isLoading {
                        HStack {
                            ProgressView()
                            Text("Đang tải...")
                        }
                    } else if roomTypes.isEmpty {
                        Text("Không có phòng trống")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(roomTypes) { roomType in
                            Button(action: {
                                selectedRoomType = roomType
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(roomType.name)
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                        Text("\(roomType.maxGuests) khách • \(roomType.availableRooms) phòng trống")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Text("\(formatPrice(roomType.basePrice))/đêm")
                                        .font(.subheadline)
                                        .foregroundColor(.blue)
                                    if selectedRoomType?.id == roomType.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("Ngày") {
                    DatePicker("Nhận phòng", selection: $checkIn, in: Date()..., displayedComponents: .date)
                    DatePicker("Trả phòng", selection: $checkOut, in: checkIn..., displayedComponents: .date)
                    Stepper("Khách: \(guestCount)", value: $guestCount, in: 1...10)
                }

                Section("Thông tin khách") {
                    TextField("Họ và tên", text: $guestName)
                    TextField("Email", text: $guestEmail)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                    TextField("Số điện thoại", text: $guestPhone)
                        .keyboardType(.phonePad)
                }

                Section("Yêu cầu đặc biệt") {
                    TextField("Nhập yêu cầu (tùy chọn)", text: $specialRequests)
                }

                if let error = errorMessage {
                    Section {
                        Text(error).foregroundColor(.red)
                    }
                }

                Section {
                    Button(action: bookRoom) {
                        HStack {
                            if isBooking {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Xác nhận đặt phòng")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(!isFormValid || isBooking || selectedRoomType == nil)
                    .listRowBackground(Color.blue)
                    .foregroundColor(.white)
                }
            }
            .navigationTitle("Đặt phòng")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
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

    private func loadRoomTypes() async {
        isLoading = true
        print("[DEBUG] Loading room types for hotel: \(hotel.id)")
        do {
            roomTypes = try await ExploreService.shared.getRoomTypes(hotelId: hotel.id)
            print("[DEBUG] Loaded \(roomTypes.count) room types")
            if let first = roomTypes.first {
                selectedRoomType = first
            }
        } catch {
            print("[DEBUG] Error loading room types: \(error)")
            errorMessage = "Không thể tải loại phòng"
        }
        isLoading = false
    }

    private var isFormValid: Bool {
        selectedRoomType != nil &&
        !guestName.isEmpty &&
        !guestEmail.isEmpty &&
        !guestPhone.isEmpty &&
        guestPhone.count >= 10
    }

    private func bookRoom() {
        guard let roomType = selectedRoomType else { return }

        isBooking = true
        errorMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        print("[DEBUG] Creating booking - hotel: \(hotel.id), room: \(roomType.id)")
        print("[DEBUG] Dates: \(formatter.string(from: checkIn)) to \(formatter.string(from: checkOut))")

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
                print("[DEBUG] Booking success!")
                dismiss()
            } catch {
                print("[DEBUG] Booking error: \(error)")
                errorMessage = "Không thể đặt phòng. Vui lòng thử lại."
            }
            isBooking = false
        }
    }

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = ""
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}
