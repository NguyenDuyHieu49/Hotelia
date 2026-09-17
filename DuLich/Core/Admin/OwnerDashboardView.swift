import SwiftUI

struct OwnerDashboardView: View {
    @State private var hotels: [Hotel] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAddHotel = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Stats Summary
                    HStack(spacing: 16) {
                        MiniStatCard(title: "Khách sạn", value: "\(hotels.count)", color: .blue)
                        MiniStatCard(title: "Đã đăng", value: "\(hotels.filter { $0.status == "PUBLISHED" }.count)", color: .green)
                        MiniStatCard(title: "Chờ duyệt", value: "\(hotels.filter { $0.status == "PENDING_APPROVAL" }.count)", color: .orange)
                    }
                    .padding(.horizontal)

                    // Hotels List
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Khách sạn của tôi")
                            .font(.headline)
                            .padding(.horizontal)

                        if hotels.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "building.2")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray)
                                Text("Bạn chưa có khách sạn nào")
                                    .foregroundColor(.secondary)
                                Button(action: { showAddHotel = true }) {
                                    Label("Thêm khách sạn", systemImage: "plus")
                                        .font(.headline)
                                        .padding()
                                        .background(Color.blue)
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                }
                            }
                            .padding(.vertical, 40)
                        } else {
                            ForEach(hotels) { hotel in
                                MyHotelCard(hotel: hotel)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Quản lý")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showAddHotel = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await loadHotels()
            }
            .task {
                await loadHotels()
            }
            .sheet(isPresented: $showAddHotel) {
                AddHotelView {
                    await loadHotels()
                }
            }
        }
    }

    private func loadHotels() async {
        isLoading = true
        do {
            hotels = try await OwnerService.shared.getMyHotels()
        } catch {
            errorMessage = "Không thể tải danh sách"
        }
        isLoading = false
    }
}

struct MiniStatCard: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}

struct MyHotelCard: View {
    let hotel: Hotel

    var statusColor: Color {
        switch hotel.status {
        case "PUBLISHED": return .green
        case "PENDING_APPROVAL": return .orange
        case "DRAFT": return .gray
        case "REJECTED": return .red
        default: return .gray
        }
    }

    var statusText: String {
        switch hotel.status {
        case "PUBLISHED": return "Đã đăng"
        case "PENDING_APPROVAL": return "Chờ duyệt"
        case "DRAFT": return "Bản nháp"
        case "REJECTED": return "Bị từ chối"
        default: return hotel.status ?? "Không xác định"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Image placeholder
            ZStack {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .cornerRadius(8)
                Image(systemName: "building.2.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(hotel.name)
                    .font(.headline)
                    .lineLimit(1)

                Text("\(hotel.address), \(hotel.city)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                HStack {
                    if let stars = hotel.starRating {
                        ForEach(0..<stars, id: \.self) { _ in
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                                .font(.caption)
                        }
                    }

                    Spacer()

                    Text(statusText)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(statusColor.opacity(0.2))
                        .foregroundColor(statusColor)
                        .cornerRadius(4)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
}
