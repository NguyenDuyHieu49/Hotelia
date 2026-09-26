import SwiftUI

// Compatibility view for callers that only accept a destination string.
// Dates and guest counts belong to ExploreFiltersView and are applied by its view model.
struct DestinationSearch: View {
    @Binding var show: Bool
    var onSearch: (String) -> Void
    @State private var destination = ""
    var body: some View {
        NavigationStack {
            Form {
                TextField("Điểm đến hoặc tên khách sạn", text: $destination).submitLabel(.search).onSubmit(search)
                Button("Tìm kiếm", action: search)
            }
            .navigationTitle("Tìm kiếm")
            .toolbar { Button("Đóng") { show = false } }
        }
    }
    private func search() { onSearch(destination.trimmingCharacters(in: .whitespacesAndNewlines)); show = false }
}
