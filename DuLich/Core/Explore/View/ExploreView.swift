import SwiftUI

struct ExploreView: View {
    @StateObject private var viewModel = ExploreViewModel()
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            VStack {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Tìm kiếm khách sạn...", text: $searchText)
                        .onSubmit {
                            Task {
                                await viewModel.searchHotels(destination: searchText)
                            }
                        }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
                .padding()

                // Content
                if viewModel.isLoading && viewModel.hotels.isEmpty {
                    Spacer()
                    ProgressView("Đang tải...")
                    Spacer()
                } else if let error = viewModel.errorMessage, viewModel.hotels.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Text(error).foregroundColor(.red)
                        Button("Thử lại") {
                            Task { await viewModel.loadHotels() }
                        }
                    }
                    Spacer()
                } else if viewModel.hotels.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "building.2")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("Không tìm thấy khách sạn")
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(viewModel.hotels) { hotel in
                                NavigationLink(destination: HotelDetailView(hotel: hotel)) {
                                    HotelCardView(hotel: hotel)
                                }
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        await viewModel.loadHotels()
                    }
                }
            }
            .navigationTitle("Khám phá")
            .task {
                if viewModel.hotels.isEmpty {
                    await viewModel.loadHotels()
                }
            }
        }
    }
}

struct HotelCardView: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image placeholder
            ZStack {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 150)
                    .cornerRadius(12)

                Image(systemName: "building.2.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.gray)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(hotel.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.red)
                    Text("\(hotel.address), \(hotel.city)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                HStack {
                    if let rating = hotel.averageRating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                        }
                    }
                    if let reviews = hotel.reviewCount {
                        Text("(\(reviews) đánh giá)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 8)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}
