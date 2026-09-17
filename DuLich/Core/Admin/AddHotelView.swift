import SwiftUI

struct AddHotelView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var description: String = ""
    @State private var address: String = ""
    @State private var city: String = ""
    @State private var district: String = ""
    @State private var starRating: Int = 3
    @State private var selectedAmenities: Set<String> = []
    @State private var isCreating = false
    @State private var errorMessage: String?

    var onComplete: (() -> Void)?

    let amenities = ["wifi", "pool", "parking", "gym", "spa", "restaurant", "ac", "tv", "minibar", "laundry"]

    var body: some View {
        NavigationView {
            Form {
                Section("Thông tin cơ bản") {
                    TextField("Tên khách sạn", text: $name)
                    TextField("Mô tả", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Địa chỉ") {
                    TextField("Địa chỉ", text: $address)
                    TextField("Thành phố", text: $city)
                    TextField("Quận/Huyện (tùy chọn)", text: $district)
                }

                Section("Xếp hạng") {
                    HStack {
                        Text("Số sao:")
                        Spacer()
                        Picker("Số sao", selection: $starRating) {
                            ForEach(1...5, id: \.self) { star in
                                HStack {
                                    ForEach(0..<star, id: \.self) { _ in
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                    }
                                }
                                .tag(star)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }

                Section("Tiện ích") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(amenities, id: \.self) { amenity in
                            Button(action: {
                                if selectedAmenities.contains(amenity) {
                                    selectedAmenities.remove(amenity)
                                } else {
                                    selectedAmenities.insert(amenity)
                                }
                            }) {
                                HStack {
                                    Image(systemName: selectedAmenities.contains(amenity) ? "checkmark.circle.fill" : "circle")
                                    Text(amenity.capitalized)
                                }
                                .font(.subheadline)
                            }
                            .buttonStyle(.plain)
                            .foregroundColor(selectedAmenities.contains(amenity) ? .blue : .primary)
                        }
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }

                Section {
                    Button(action: createHotel) {
                        HStack {
                            if isCreating {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Tạo khách sạn")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(!isFormValid || isCreating)
                    .listRowBackground(Color.blue)
                    .foregroundColor(.white)
                }
            }
            .navigationTitle("Thêm khách sạn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Hủy") { dismiss() }
                }
            }
        }
    }

    private var isFormValid: Bool {
        !name.isEmpty &&
        !description.isEmpty &&
        !address.isEmpty &&
        !city.isEmpty &&
        starRating >= 1
    }

    private func createHotel() {
        isCreating = true
        errorMessage = nil

        Task {
            do {
                _ = try await OwnerService.shared.createHotel(
                    name: name,
                    description: description,
                    address: address,
                    city: city,
                    district: district.isEmpty ? nil : district,
                    starRating: starRating,
                    amenities: Array(selectedAmenities)
                )
                onComplete?()
                dismiss()
            } catch {
                errorMessage = "Không thể tạo khách sạn"
            }
            isCreating = false
        }
    }
}
