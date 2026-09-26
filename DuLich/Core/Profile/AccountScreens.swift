import SwiftUI
import Combine

@MainActor
final class FavoritesStore: ObservableObject {
    static let shared = FavoritesStore()
    @Published var hotels: [Hotel] = []
    @Published var busy: Set<String> = []
    private var userId: String?
    func load() async throws {
        let current = AuthService.shared.getCurrentUser()?.id
        if current != userId { hotels = []; userId = current }
        guard current != nil else { return }
        let result: [Hotel] = try await APIClient.shared.request(endpoint: "/account/favorites")
        guard current == AuthService.shared.getCurrentUser()?.id else { return }
        hotels = result
    }
    func toggle(_ hotel: Hotel) async throws {
        guard !busy.contains(hotel.id) else { return }
        busy.insert(hotel.id)
        defer { busy.remove(hotel.id) }
        let saved = hotels.contains { $0.id == hotel.id }
        try await APIClient.shared.requestVoid(endpoint: "/account/favorites/\(hotel.id)", method: saved ? "DELETE" : "PUT")
        if saved { hotels.removeAll { $0.id == hotel.id } } else { hotels.insert(hotel, at: 0) }
    }
}

struct FavoriteHotelButton: View {
    let hotel: Hotel
    @ObservedObject private var store = FavoritesStore.shared
    @State private var error: String?
    var body: some View {
        Button {
            Task {
                do { try await store.toggle(hotel) }
                catch { self.error = error.localizedDescription }
            }
        } label: {
            Image(systemName: store.hotels.contains { $0.id == hotel.id } ? "heart.fill" : "heart")
                .foregroundStyle(.pink).frame(width: 42, height: 42)
                .background(.regularMaterial, in: Circle())
        }
        .buttonStyle(.plain)
        .disabled(store.busy.contains(hotel.id))
        .accessibilityLabel(store.hotels.contains { $0.id == hotel.id } ? "Bỏ lưu \(hotel.name)" : "Lưu \(hotel.name)")
        .alert("Không thể cập nhật", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("Đóng", role: .cancel) { error = nil }
        } message: { Text(error ?? "") }
    }
}

struct SavedHotelsView: View {
    @ObservedObject private var store = FavoritesStore.shared
    @State private var error: String?
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if let error { Text(error).foregroundStyle(.red) }
                if store.hotels.isEmpty { Text("Chưa lưu khách sạn nào. Bấm biểu tượng trái tim để lưu.").padding() }
                ForEach(store.hotels) { hotel in
                    NavigationLink { HotelDetailView(hotel: hotel) } label: { HotelExploreCard(hotel: hotel) }
                        .buttonStyle(HotelCardPressStyle())
                        .accessibilityLabel("Xem \(hotel.name), \(hotel.city), \(hotel.ratingSummary)")
                        .overlay(alignment: .topTrailing) { FavoriteHotelButton(hotel: hotel).padding(12) }
                }
            }.padding()
        }
        .navigationTitle("Khách sạn đã lưu")
        .task { await load() }
        .refreshable { await load() }
    }
    private func load() async {
        do { try await store.load(); error = nil } catch { self.error = error.localizedDescription }
    }
}

struct EditProfileView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var name = ""
    @State private var phone = ""
    @State private var message: String?
    @State private var busy = false
    var body: some View {
        Form {
            TextField("Họ và tên", text: $name)
            TextField("Số điện thoại", text: $phone).keyboardType(.phonePad)
            Text(auth.currentUser?.email ?? "").foregroundStyle(.secondary)
            if let message { Text(message) }
            Button(busy ? "Đang lưu…" : "Lưu thay đổi") {
                busy = true
                Task {
                    do {
                        let user: User = try await APIClient.shared.request(endpoint: "/users/me", method: "PUT", body: ["name": name.trimmingCharacters(in: .whitespacesAndNewlines), "phone": phone])
                        auth.currentUser = user
                        if let data = try? JSONEncoder().encode(user) { UserDefaults.standard.set(data, forKey: "currentUser") }
                        message = "Đã cập nhật hồ sơ"
                    } catch { message = error.localizedDescription }
                    busy = false
                }
            }.disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
        }
        .navigationTitle("Thông tin cá nhân")
        .onAppear { name = auth.currentUser?.name ?? ""; phone = auth.currentUser?.phone ?? "" }
    }
}

struct ChangePasswordView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var current = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        Form {
            SecureField("Mật khẩu hiện tại", text: $current)
            SecureField("Mật khẩu mới (ít nhất 8 ký tự)", text: $password)
            SecureField("Nhập lại mật khẩu mới", text: $confirmation)
            Text("Sau khi đổi mật khẩu, vui lòng đăng nhập lại.").font(.caption)
            if let error { Text(error).foregroundStyle(.red) }
            Button(busy ? "Đang cập nhật…" : "Đổi mật khẩu") {
                busy = true
                Task {
                    do {
                        try await APIClient.shared.requestVoid(endpoint: "/account/password", body: ["currentPassword": current, "newPassword": password])
                        auth.logout()
                    } catch { self.error = error.localizedDescription }
                    busy = false
                }
            }.disabled(busy || current.isEmpty || password.count < 8 || password != confirmation || password == current)
        }.navigationTitle("Bảo mật")
    }
}

struct AppNotification: Decodable, Identifiable {
    let id: String
    let title: String
    let message: String
    let isRead: Bool
    enum CodingKeys: String, CodingKey { case id = "_id", title, message, isRead }
}
private struct NotificationPage: Decodable { let notifications: [AppNotification]; let unread: Int }
struct NotificationsView: View {
    @State private var items: [AppNotification] = []
    @State private var error: String?
    @State private var busy = false
    @State private var page = 1
    @State private var hasMore = false
    var body: some View {
        List {
            if let error { Text(error).foregroundStyle(.red) }
            if items.isEmpty && !busy { Text("Chưa có thông báo") }
            ForEach(items) { item in
                Button {
                    Task {
                        do {
                            try await APIClient.shared.requestVoid(endpoint: "/notifications/\(item.id)/read")
                            await load()
                        } catch { self.error = error.localizedDescription }
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(item.title).fontWeight(item.isRead ? .regular : .bold)
                        Text(item.message).font(.subheadline).foregroundStyle(.secondary)
                    }
                }.foregroundStyle(.primary)
            }
            if hasMore { Button("Tải thêm") { Task { await load(next: true) } }.disabled(busy) }
            if busy { ProgressView() }
        }
        .navigationTitle("Thông báo").toolbar(.visible, for: .navigationBar)
        .toolbar { Button("Đọc tất cả") {
            Task {
                do { try await APIClient.shared.requestVoid(endpoint: "/notifications/read-all"); await load() }
                catch { self.error = error.localizedDescription }
            }
        }.disabled(items.isEmpty || busy) }
        .task { await load() }.refreshable { await load() }
    }
    private func load(next: Bool = false) async {
        busy = true
        defer { busy = false }
        do {
            let requested = next ? page + 1 : 1
            let data: NotificationPage = try await APIClient.shared.request(endpoint: "/notifications?page=\(requested)&limit=20")
            items = next ? items + data.notifications : data.notifications
            page = requested; hasMore = data.notifications.count == 20; error = nil
        } catch { if !Task.isCancelled { self.error = error.localizedDescription } }
    }
}

struct SupportTicket: Decodable, Identifiable {
    let id: String
    let subject: String
    let message: String
    let status: String
    let reply: String?
    enum CodingKeys: String, CodingKey { case id = "_id", subject, message, status, reply }
}
struct SupportView: View {
    var bookingId: String? = nil
    @State private var subject = ""
    @State private var message = ""
    @State private var tickets: [SupportTicket] = []
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        Form {
            Section("Gửi yêu cầu hỗ trợ") {
                if let bookingId { Text("Booking: \(bookingId)").font(.caption) }
                TextField("Tiêu đề", text: $subject)
                TextField("Mô tả vấn đề (ít nhất 10 ký tự)", text: $message, axis: .vertical).lineLimit(3...8)
                if let error { Text(error).foregroundStyle(.red) }
                Button(busy ? "Đang gửi…" : "Gửi yêu cầu") {
                    busy = true
                    Task {
                        do {
                            let ticket: SupportTicket = try await APIClient.shared.request(endpoint: "/account/support", method: "POST", body: ["subject": subject, "message": (bookingId.map { "Booking: \($0)\n" } ?? "") + message])
                            tickets.insert(ticket, at: 0); subject = ""; message = ""; error = nil
                        } catch { self.error = error.localizedDescription }
                        busy = false
                    }
                }.disabled(busy || subject.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 || message.trimmingCharacters(in: .whitespacesAndNewlines).count < 10)
            }
            Section("Yêu cầu đã gửi") {
                if tickets.isEmpty { Text("Chưa có yêu cầu") }
                ForEach(tickets) { ticket in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(ticket.subject).font(.headline)
                        Text(ticket.message)
                        Text(ticket.status == "RESOLVED" ? "Đã phản hồi" : "Đang chờ xử lý").font(.caption).foregroundStyle(.secondary)
                        if let reply = ticket.reply { Text("Phản hồi: \(reply)").foregroundStyle(.blue) }
                    }
                }
            }
        }.navigationTitle("Trợ giúp")
        .task {
            do { tickets = try await APIClient.shared.request(endpoint: "/account/support") }
            catch { self.error = error.localizedDescription }
        }
    }
}

struct AboutHoteliaView: View {
    var body: some View {
        List {
            Section("Hotelia") {
                Text("Tìm khách sạn, lưu nơi yêu thích và quản lý chuyến đi của bạn.")
                Text("Phiên bản \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")")
            }
            Section("Thông tin bản demo") {
                Text("Ảnh và tên khách sạn lấy từ nguồn chính thức. Giá và tồn phòng trong ứng dụng là dữ liệu minh họa, chưa kết nối hệ thống bán phòng của khách sạn.")
                Text("Điểm đánh giá đến từ người dùng trong ứng dụng. Đề xuất dựa trên lịch sử xem và đặt phòng.")
            }
        }.navigationTitle("Về Hotelia")
    }
}
