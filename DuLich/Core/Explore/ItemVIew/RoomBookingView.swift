import SwiftUI

struct RoomBookingView: View {
    let hotel: Hotel
    @Environment(\.dismiss) private var dismiss

    @State private var checkIn: Date = Date()
    @State private var checkOut: Date = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    @State private var guestCount: Int = 1
    @State private var guestName: String = ""
    @State private var guestEmail: String = ""
    @State private var guestPhone: String = ""
    @State private var specialRequests: String = ""
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
                    .disabled(!isFormValid || isBooking)
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
            .onAppear {
                if let user = AuthService.shared.getCurrentUser() {
                    guestName = user.name
                    guestEmail = user.email
                    guestPhone = user.phone ?? ""
                }
            }
        }
    }

    private var isFormValid: Bool {
        !guestName.isEmpty &&
        !guestEmail.isEmpty &&
        !guestPhone.isEmpty &&
        guestPhone.count >= 10
    }

    private func bookRoom() {
        isBooking = true
        errorMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        Task {
            do {
                bookingResult = try await BookingService.shared.createBooking(
                    hotelId: hotel.id,
                    roomTypeId: "default",
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
