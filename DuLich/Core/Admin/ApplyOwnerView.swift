import SwiftUI

struct ApplyOwnerView: View {
    @State private var businessName = ""
    @State private var license = ""
    @State private var message: String?
    @State private var busy = false
    @State private var submitted = false
    var body: some View {
        Form {
            TextField("Tên doanh nghiệp", text: $businessName)
            TextField("Mã giấy phép kinh doanh", text: $license)
            Text("Yêu cầu cần được quản trị viên phê duyệt. Sau khi được duyệt, đăng nhập lại để mở mục Quản lý.").font(.caption)
            if let message { Text(message) }
            Button(submitted ? "Đã gửi yêu cầu" : "Đăng ký chủ khách sạn") {
                busy = true
                Task {
                    do {
                        try await OwnerService.shared.applyOwner(businessName: businessName, businessLicense: license.isEmpty ? nil : license)
                        message = "Đã gửi yêu cầu. Vui lòng chờ quản trị viên duyệt."; submitted = true
                    } catch { message = error.localizedDescription }
                    busy = false
                }
            }.disabled(busy || submitted || businessName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
        }.navigationTitle("Trở thành đối tác")
    }
}
