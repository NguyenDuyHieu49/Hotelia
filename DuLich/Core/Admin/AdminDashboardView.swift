import SwiftUI

struct AdminDashboardView: View {
    @State private var stats: AdminStats?
    @State private var pendingOwners: [HotelUser] = []
    @State private var pendingHotels: [Hotel] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Stats Cards
                    if let stats = stats {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            StatCard(title: "Người dùng", value: "\(stats.users)", icon: "person.2.fill", color: .blue)
                            StatCard(title: "Chủ khách sạn", value: "\(stats.owners)", icon: "building.2.fill", color: .green)
                            StatCard(title: "Khách sạn", value: "\(stats.hotels)", icon: "building.fill", color: .orange)
                            StatCard(title: "Đặt phòng", value: "\(stats.bookings)", icon: "calendar", color: .purple)
                        }
                        .padding(.horizontal)
                    }

                    Divider()
                        .padding(.horizontal)

                    // Pending Owners Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Yêu cầu làm Chủ khách sạn")
                            .font(.headline)
                            .padding(.horizontal)

                        if pendingOwners.isEmpty {
                            Text("Không có yêu cầu nào")
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            ForEach(pendingOwners) { owner in
                                OwnerApprovalCard(owner: owner) {
                                    approveOwner(id: owner.id)
                                } onReject: {
                                    // TODO: Reject owner
                                }
                            }
                        }
                    }

                    Divider()
                        .padding(.horizontal)

                    // Pending Hotels Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Khách sạn chờ duyệt")
                            .font(.headline)
                            .padding(.horizontal)

                        if pendingHotels.isEmpty {
                            Text("Không có khách sạn nào chờ duyệt")
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            ForEach(pendingHotels) { hotel in
                                HotelApprovalCard(hotel: hotel) {
                                    approveHotel(id: hotel.id)
                                } onReject: {
                                    // TODO: Reject hotel
                                }
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Admin Dashboard")
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
        }
    }

    private func loadData() async {
        isLoading = true
        do {
            stats = try await AdminService.shared.getStats()
            pendingOwners = try await AdminService.shared.getPendingOwners()
            pendingHotels = try await AdminService.shared.getPendingHotels()
        } catch {
            errorMessage = "Không thể tải dữ liệu"
        }
        isLoading = false
    }

    private func approveOwner(id: String) {
        Task {
            do {
                _ = try await AdminService.shared.approveOwner(id: id)
                await loadData()
            } catch {
                errorMessage = "Không thể duyệt"
            }
        }
    }

    private func approveHotel(id: String) {
        Task {
            do {
                _ = try await AdminService.shared.approveHotel(id: id)
                await loadData()
            } catch {
                errorMessage = "Không thể duyệt"
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(color)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct OwnerApprovalCard: View {
    let owner: HotelUser
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.blue)
                VStack(alignment: .leading) {
                    Text(owner.name)
                        .font(.headline)
                    Text(owner.email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let business = owner.businessName {
                        Text(business)
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
                Spacer()
            }

            HStack {
                Button(action: onApprove) {
                    Text("Duyệt")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }

                Button(action: onReject) {
                    Text("Từ chối")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.2))
                        .foregroundColor(.red)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
}

struct HotelApprovalCard: View {
    let hotel: Hotel
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "building.2.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.orange)
                VStack(alignment: .leading) {
                    Text(hotel.name)
                        .font(.headline)
                    Text("\(hotel.address), \(hotel.city)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let stars = hotel.starRating {
                        HStack {
                            ForEach(0..<stars, id: \.self) { _ in
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                    .font(.caption)
                            }
                        }
                    }
                }
                Spacer()
            }

            HStack {
                Button(action: onApprove) {
                    Text("Duyệt")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }

                Button(action: onReject) {
                    Text("Từ chối")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.2))
                        .foregroundColor(.red)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
}
