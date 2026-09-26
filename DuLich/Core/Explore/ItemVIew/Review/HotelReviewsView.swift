import SwiftUI

struct HotelReviewsView: View {
    let hotel: Hotel
    @State private var reviews: [Review] = []
    @State private var page = 0
    @State private var total = 0
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                Text(hotel.name).font(.headline)
                if let error { Text(error).foregroundStyle(.red); Button("Thử lại") { Task { await load(reset: page == 0) } } }
                if reviews.isEmpty && !busy { Text("Chưa có đánh giá") }
                ForEach(reviews) { ReviewCardItemView(review: $0) }
                if busy { ProgressView() }
                if reviews.count < total { Button("Tải thêm") { Task { await load() } }.disabled(busy) }
            }.padding()
        }.navigationTitle("Đánh giá")
        .task { await load(reset: true) }
        .refreshable { await load(reset: true) }
    }
    private func load(reset: Bool = false) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            let next = reset ? 1 : page + 1
            let data = try await ReviewService.shared.getReviews(hotelId: hotel.id, page: next)
            reviews = reset ? data.reviews : reviews + data.reviews
            page = next; total = data.total; error = nil
        } catch { self.error = error.localizedDescription }
    }
}

struct WriteReviewView: View {
    let booking: Booking
    @Environment(\.dismiss) private var dismiss
    @State private var rating = 5
    @State private var content = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        Form {
            Picker("Điểm đánh giá", selection: $rating) { ForEach(1...5, id: \.self) { Text("\($0)/5").tag($0) } }
            TextField("Chia sẻ trải nghiệm (ít nhất 10 ký tự)", text: $content, axis: .vertical).lineLimit(4...10)
            if let error { Text(error).foregroundStyle(.red) }
            Button(busy ? "Đang gửi…" : "Gửi đánh giá") {
                busy = true
                Task {
                    do {
                        _ = try await ReviewService.shared.createReview(hotelId: booking.hotelId, rating: rating, content: content, bookingId: booking.id)
                        dismiss()
                    } catch { self.error = error.localizedDescription }
                    busy = false
                }
            }.disabled(busy || content.trimmingCharacters(in: .whitespacesAndNewlines).count < 10)
        }.navigationTitle("Đánh giá chuyến đi")
    }
}
