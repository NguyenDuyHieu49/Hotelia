# ĐỒ ÁN LIÊN NGÀNH

## ĐỀ XUẤT DỰ ÁN

**TÊN DỰ ÁN:** Phát triển ứng dụng đặt phòng khách sạn trực tuyến

**SINH VIÊN:** Nguyễn Duy Hiệu

**THỜI GIAN THỰC HIỆN:** 01/03/2026 - 01/09/2026

---

**PHẠM VI CÔNG VIỆC:**

**Nhiệm vụ 1. Xác định yêu cầu của dự án "Phát triển ứng dụng đặt phòng khách sạn trực tuyến"**

- Tìm hiểu về công cụ lập trình: Nghiên cứu và hiểu rõ về SwiftUI, framework phát triển ứng dụng iOS của Apple kết hợp với NestJS cho backend và MongoDB cho cơ sở dữ liệu.
- Nghiên cứu yêu cầu của đề tài: Bao gồm cách hoạt động của ứng dụng đặt phòng, giao diện người dùng trên SwiftUI, thiết kế REST API trên NestJS và cấu trúc dữ liệu trên MongoDB.
- Tìm hiểu về các dịch vụ backend: Firebase (Authentication, Firestore), Cloudinary (lưu trữ hình ảnh), và các cổng thanh toán (MoMo, VNPay) để thay thế bằng hệ thống tự xây dựng với JWT, MongoDB và mock payment.
- Tìm hiểu về các phương thức xây dựng phần mềm và các tài liệu tham khảo liên quan: Nghiên cứu về các phương pháp phát triển phần mềm hiện đại như kiến trúc Modular Monolith, mô hình MVVM cho SwiftUI, kiến trúc RESTful API, và các best practices trong phát triển ứng dụng full-stack.

**Nhiệm vụ 2. Triển khai dự án**

- Sử dụng công cụ lập trình SwiftUI cho frontend iOS và NestJS cho backend: SwiftUI để phát triển giao diện người dùng, NestJS với MongoDB để xây dựng API và quản lý dữ liệu, JWT để xác thực người dùng thay thế Firebase Auth.
- Triển khai các chức năng chính của ứng dụng: Xây dựng các tính năng như đăng nhập/đăng ký với JWT, tìm kiếm khách sạn, xem chi tiết, đặt phòng với state machine đầy đủ, thanh toán mock (MoMo, VNPay, chuyển khoản, COD), và quản lý booking.
- Triển khai hệ thống đánh giá: Cho phép người dùng viết và xem đánh giá khách sạn sau khi hoàn thành booking.
- Triển khai trang quản trị admin và dashboard cho chủ khách sạn: Quản lý khách sạn với approval workflow, thêm/xóa khách sạn với upload ảnh, quản lý loại phòng và availability.

**Nhiệm vụ 3. Cải tiến và hoàn thiện các chức năng của dự án**

- Hoàn thiện các chức năng của dự án: Tối ưu hóa và mở rộng các tính năng đã triển khai, cải thiện trải nghiệm người dùng, xử lý concurrency và chống double booking với MongoDB transactions.
- Kiểm thử dự án: Thực hiện kiểm thử bao gồm unit test, integration test và E2E test để đảm bảo chất lượng và tính ổn định của ứng dụng trên các thiết bị iOS và backend.
- Gỡ lỗi và sửa các lỗi phát sinh trong quá trình kiểm thử: Khắc phục các lỗi để đảm bảo ứng dụng hoạt động mượt mà, bao gồm xử lý race condition trong đặt phòng và thanh toán.
- Tối ưu hiệu suất: Cải thiện tốc độ tải dữ liệu, tối ưu hóa hình ảnh và caching, thiết lập MongoDB indexes cho tìm kiếm hiệu quả.

**Nhiệm vụ 4. Hoàn thành báo cáo và trình bày sản phẩm**

- Viết báo cáo mô tả các quá trình thực hiện dự án: Ghi chép lại từng bước thực hiện, các công cụ và phương pháp sử dụng trong suốt quá trình phát triển.
- Viết báo cáo cuối cùng mô tả hoàn chỉnh quá trình phát triển: Mô tả chi tiết các vấn đề gặp phải, cách giải quyết, và kết quả đạt được sau khi hoàn thành dự án, kèm theo hướng dẫn cài đặt và sử dụng.

---

**KẾT QUẢ DỰ ÁN:** Các kết quả dự án bao gồm

- Nghiên cứu và tìm hiểu về nền tảng sử dụng: Bao gồm SwiftUI cho phát triển ứng dụng iOS, NestJS cho xây dựng REST API backend, MongoDB với Mongoose làm ODM, JWT cho hệ thống xác thực, và tích hợp thanh toán MoMo/VNPay (mock), được ghi chép chi tiết trong báo cáo kỹ thuật.
- Phân tích và thiết kế sản phẩm: Tạo ra thiết kế chi tiết cho ứng dụng đặt phòng khách sạn dựa trên yêu cầu đã xác định, bao gồm kiến trúc tổng thể, database schema, ERD, API specification, và Software Design Document (SDD) đầy đủ.
- Sản phẩm hoàn thiện: Ứng dụng đặt phòng khách sạn trực tuyến hoàn chỉnh trên iOS với SwiftUI, backend NestJS với MongoDB, bao gồm các tính năng: xác thực người dùng với JWT (Google, Email, Anonymous), tìm kiếm và duyệt khách sạn với bộ lọc nâng cao, xem thời tiết theo thành phố, đặt phòng với booking state machine 10 trạng thái, thanh toán với nhiều phương thức (mock MoMo, VNPay, chuyển khoản, COD), quản lý lịch sử đặt phòng, hệ thống đánh giá, trang quản trị admin, và dashboard cho chủ khách sạn.
- Báo cáo hoàn thiện: Báo cáo chi tiết về toàn bộ quá trình phát triển, bao gồm yêu cầu hệ thống, phân tích thiết kế, mô tả chức năng, kết quả kiểm thử, những thách thức gặp phải và kết quả cuối cùng đạt được, kèm theo hướng dẫn vận hành và tài liệu tham khảo.

---

Hà Nội, ngày 02 tháng 09 năm 2026

Xác nhận của GVHD
