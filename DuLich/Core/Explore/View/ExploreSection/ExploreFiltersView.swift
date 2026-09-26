import SwiftUI

private struct HotelSearchFiltersKey: EnvironmentKey { static let defaultValue = HotelSearchFilters() }
extension EnvironmentValues {
    var hotelSearchFilters: HotelSearchFilters {
        get { self[HotelSearchFiltersKey.self] }
        set { self[HotelSearchFiltersKey.self] = newValue }
    }
}

struct ExploreFiltersView: View {
    @Environment(\.dismiss) private var dismiss
    @State var filters: HotelSearchFilters
    let onApply: (HotelSearchFilters) -> Void
    @State private var useDates = false
    @State private var start = Date()
    @State private var end = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
    private var formatter: DateFormatter {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f
    }
    var body: some View {
        NavigationStack {
            Form {
                Section("Ngày lưu trú") {
                    Toggle("Chọn ngày cụ thể", isOn: $useDates)
                    if useDates {
                        DatePicker("Nhận phòng", selection: $start, in: Date()..., displayedComponents: .date)
                        DatePicker("Trả phòng", selection: $end, in: start..., displayedComponents: .date)
                    }
                }
                Section("Số khách trong một phòng") { Stepper("\(filters.guests) khách", value: $filters.guests, in: 1...10) }
                Section("Giá mỗi đêm (VND)") {
                    TextField("Giá thấp nhất", value: $filters.minPrice, format: .number).keyboardType(.numberPad)
                    TextField("Giá cao nhất", value: $filters.maxPrice, format: .number).keyboardType(.numberPad)
                }
                Section("Đánh giá của khách") {
                    Picker("Điểm tối thiểu", selection: Binding(get: { filters.minRating ?? 0 }, set: { filters.minRating = $0 == 0 ? nil : $0 })) {
                        Text("Không giới hạn").tag(0)
                        ForEach(1...5, id: \.self) { Text("Từ \($0)/5").tag($0) }
                    }
                }
                Button("Xóa bộ lọc") { filters = HotelSearchFilters(); useDates = false }
                Button("Áp dụng") {
                    filters.checkIn = useDates ? formatter.string(from: start) : nil
                    filters.checkOut = useDates ? formatter.string(from: end) : nil
                    onApply(filters); dismiss()
                }.disabled((filters.minPrice ?? 0) < 0 || (filters.maxPrice ?? Int.max) < (filters.minPrice ?? 0) || (useDates && formatter.string(from: end) <= formatter.string(from: start)))
            }
            .navigationTitle("Tìm phòng phù hợp").navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Đóng") { dismiss() } }
            .onAppear {
                useDates = filters.checkIn != nil
                if let value = filters.checkIn, let date = formatter.date(from: value) { start = date }
                if let value = filters.checkOut, let date = formatter.date(from: value) { end = date }
            }
        }
    }
}
