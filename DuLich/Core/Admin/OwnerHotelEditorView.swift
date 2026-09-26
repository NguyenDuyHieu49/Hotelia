import SwiftUI

struct OwnerHotelEditorView: View {
    let hotel: Hotel
    @State private var name = ""
    @State private var description = ""
    @State private var address = ""
    @State private var city = ""
    @State private var imageURLs = ""
    @State private var status = ""
    @State private var rooms: [RoomType] = []
    @State private var message: String?
    @State private var busy = false
    @State private var addRoom = false
    @State private var editingRoom: RoomType?
    var body: some View {
        Form {
            Section("Thông tin khách sạn") {
                TextField("Tên", text: $name)
                TextField("Mô tả", text: $description, axis: .vertical)
                TextField("Địa chỉ", text: $address)
                TextField("Thành phố", text: $city)
                TextField("URL ảnh (mỗi dòng một ảnh)", text: $imageURLs, axis: .vertical)
                Button("Lưu thay đổi") { update() }.disabled(busy || name.count < 2 || description.count < 10 || address.isEmpty || city.isEmpty)
                Text("Trạng thái: \(status)")
                if ["DRAFT", "REJECTED"].contains(status) {
                    Button("Gửi duyệt") {
                        busy = true
                        Task {
                            do { try await OwnerService.shared.submitForApproval(hotelId: hotel.id); status = "PENDING_APPROVAL"; message = "Đã gửi duyệt" }
                            catch { message = error.localizedDescription }
                            busy = false
                        }
                    }.disabled(busy)
                }
            }
            if let message { Text(message) }
            Section("Loại phòng") {
                ForEach(rooms) { room in
                    Button { editingRoom = room } label: {
                        VStack(alignment: .leading) {
                            Text(room.name)
                            Text("\(room.basePrice)đ/đêm · \(room.maxGuests) khách · \(room.totalRooms) phòng").font(.caption)
                        }
                    }
                }
                Button("Thêm loại phòng") { addRoom = true }
            }
        }.navigationTitle("Quản lý khách sạn")
        .task {
            name = hotel.name; description = hotel.description; address = hotel.address; city = hotel.city
            imageURLs = hotel.images?.joined(separator: "\n") ?? ""; status = hotel.status ?? ""
            await loadRooms()
        }
        .sheet(isPresented: $addRoom, onDismiss: { Task { await loadRooms() } }) { OwnerRoomEditorView(hotelId: hotel.id) }
        .sheet(item: $editingRoom, onDismiss: { Task { await loadRooms() } }) { OwnerRoomEditorView(hotelId: hotel.id, room: $0) }
    }
    private func loadRooms() async {
        do { rooms = try await ExploreService.shared.getRoomTypes(hotelId: hotel.id) }
        catch { message = error.localizedDescription }
    }
    private func update() {
        busy = true
        Task {
            do {
                _ = try await OwnerService.shared.updateHotel(id: hotel.id, data: ["name": name, "description": description, "address": address, "city": city, "images": imageURLs.split(separator: "\n").map(String.init)])
                message = "Đã lưu thay đổi"
            } catch { message = error.localizedDescription }
            busy = false
        }
    }
}

struct OwnerRoomEditorView: View {
    let hotelId: String
    var room: RoomType?
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var description = ""
    @State private var price = 500000
    @State private var guests = 2
    @State private var count = 1
    @State private var images = ""
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        NavigationStack {
            Form {
                TextField("Tên loại phòng", text: $name)
                TextField("Mô tả", text: $description, axis: .vertical)
                LabeledContent("Giá/đêm (VND)") { TextField("Giá", value: $price, format: .number).keyboardType(.numberPad) }
                Stepper("\(guests) khách", value: $guests, in: 1...10)
                Stepper("\(count) phòng", value: $count, in: 1...1000)
                TextField("URL ảnh (mỗi dòng một ảnh)", text: $images, axis: .vertical)
                if let error { Text(error).foregroundStyle(.red) }
                Button("Lưu loại phòng") {
                    busy = true
                    Task {
                        do {
                            try await APIClient.shared.requestVoid(endpoint: room.map { "/room-types/\($0.id)" } ?? "/room-types/hotel/\(hotelId)", method: room == nil ? "POST" : "PUT", body: ["name": name, "description": description, "basePrice": price, "maxGuests": guests, "totalRooms": count, "images": images.split(separator: "\n").map(String.init)])
                            dismiss()
                        } catch { self.error = error.localizedDescription }
                        busy = false
                    }
                }.disabled(busy || name.isEmpty || description.isEmpty || price <= 0)
            }.navigationTitle(room == nil ? "Thêm loại phòng" : "Sửa loại phòng")
            .toolbar { Button("Đóng") { dismiss() }.disabled(busy) }
            .onAppear { if let room { name = room.name; description = room.description ?? ""; price = room.basePrice; guests = room.maxGuests; count = room.totalRooms; images = room.images?.joined(separator: "\n") ?? "" } }
        }
    }
}
