# Demo cá nhân hóa đề xuất

## Demo trực tiếp trong ứng dụng

1. Chạy backend và bản Hotelia iOS mới nhất. Tạo hai tài khoản khách mới A và B, chưa có booking hay lịch sử xem. Ghi lại danh sách đề xuất ban đầu ở mục **Tất cả**.
2. Với A, mở chi tiết **HAIAN Beach Hotel & Spa** ở Đà Nẵng. Quay lại Explore, chọn **Tất cả**, kéo xuống để làm mới. Nhóm khách sạn Đà Nẵng sẽ được ưu tiên.
3. Đăng xuất A, đăng nhập B. Mở **Pan Pacific Hanoi**, quay lại Explore, chọn **Tất cả** và làm mới. Nhóm khách sạn Hà Nội sẽ được ưu tiên.
4. So sánh hai danh sách khi đều đang ở **Tất cả**. Đổi bộ lọc điểm đến chỉ chứng minh tìm kiếm; lịch sử khác nhau dưới cùng bộ lọc mới chứng minh cá nhân hóa.

Không cần tạo booking để demo. Tài khoản đã có booking có thể cho thứ tự khác vì booking được xác nhận có trọng số cao hơn lượt xem. Xóa lịch sử xem không xóa ảnh hưởng của booking. Mở lại một khách sạn chỉ cập nhật độ gần đây, không tăng số tín hiệu độc lập.

## Demo tự động, có thể chạy lại

Backend cần đang chạy ở cổng 3000. Tại thư mục gốc project:

```sh
node backend/scripts/demo-recommendations.cjs
```

Script tạo hai UUID khách tạm thời, xác minh thứ tự ban đầu giống nhau, ghi một lượt xem riêng cho mỗi khách, kiểm tra lịch sử không lẫn nhau, rồi in top 3 không lọc điểm đến. Sau đó tự xóa lịch sử của đúng hai phiên vừa tạo. Không thay đổi tài khoản thật hay booking. Có thể đặt `DEMO_API_URL` nếu backend chạy tại địa chỉ khác.

Kết quả thực nghiệm ngày 25/09/2026:

- Khách A: HAIAN → Novotel Danang Premier Han River → Four Points by Sheraton Danang.
- Khách B: Pan Pacific Hanoi → LOTTE HOTEL HANOI → Meliá Hanoi.

Đây là gợi ý dựa trên nội dung và hành vi với trọng số minh bạch, chưa phải mô hình ML đã huấn luyện. Xem [cơ chế và giới hạn](Recommendation.md).

## Đánh giá và ảnh

20 khách sạn hiện chưa có đánh giá trong ứng dụng. `averageRating=0`, `reviewCount=0` là trạng thái chưa được đánh giá; giao diện hiển thị **Chưa có đánh giá** hoặc ẩn huy hiệu điểm. Không lấy số sao khách sạn làm điểm khách hàng, không tạo review giả.

Đã cập nhật 20 ảnh đại diện và 60 ảnh loại phòng từ website chính thức; tên phòng khớp tên hạng phòng/nhóm ảnh tại nguồn. LOTTE sử dụng nhóm gallery Standard, Club Floor, Suite, không xác nhận phân hạng chi tiết hơn. Một số ảnh đại diện khách sạn là ảnh phòng bên trong chính khách sạn đó. Ảnh được lưu ở backend để tránh lỗi hotlink hoặc định dạng không tương thích; đường dẫn `/media/` được iOS ghép với host của API.

Giá, sức chứa, tiện nghi phòng và số lượng phòng vẫn là dữ liệu demo. ID và booking được giữ nguyên. Nguồn ảnh, URL gốc và SHA-256 từng file nằm trong [manifest](../backend/data/verified-media.v1.json).

Kiểm tra lại API và toàn bộ 80 ảnh:

```sh
node backend/scripts/verify-hotel-media.cjs
```

Khi triển khai backend, phải đưa cả `backend/public/media` lên cùng `dist`; chỉ sao chép `dist` sẽ làm mất ảnh. Khi chạy trên iPhone thật, cấu hình API host trỏ tới máy chủ có thể truy cập từ điện thoại; `127.0.0.1` chỉ phù hợp simulator trên máy đang chạy backend.
