# Hotelia

Nền tảng đặt phòng khách sạn có gợi ý cá nhân hóa, gồm ứng dụng iOS cho khách, bảng điều khiển web cho chủ khách sạn và quản trị viên, máy chủ NestJS với MongoDB, và mô hình xếp hạng LightGBM chạy ngay trong máy chủ.


| Thành phần | Địa chỉ |
|---|---|
| API | `https://api.hotelia.asia/api/v1` |
| Bảng điều khiển chủ khách sạn và quản trị viên | `https://admin.hotelia.asia` |
| `hotelia.asia`, `www.hotelia.asia` | Chuyển hướng 308 tới `admin.hotelia.asia` |

Khách dùng ứng dụng iOS; dự án không có trang web đặt phòng cho khách.

---

## Chức năng

**Khách (ứng dụng iOS, tiếng Việt và tiếng Anh)**
- Đăng ký, đăng nhập bằng email, Google hoặc Apple; quên và đổi mật khẩu.
- Tìm kiếm theo điểm đến, ngày, số khách, khoảng giá, điểm và tiện nghi.
- Hàng "Đề xuất cho bạn" cá nhân hóa theo lịch sử xem và đặt phòng; có thể xóa lịch sử gợi ý.
- Xem số phòng trống theo khoảng ngày, đặt phòng và giữ phòng 15 phút.
- Thanh toán qua payOS (VietQR) hoặc trả tại khách sạn; hủy đặt phòng.
- Lịch sử đặt phòng, đánh giá sau lưu trú, khách sạn yêu thích, thông báo, yêu cầu hỗ trợ.
- Thẻ thời tiết cho 8 thành phố (Open-Meteo).

**Chủ khách sạn (bảng điều khiển web)**
- Đăng ký làm chủ khách sạn và chờ duyệt.
- Tạo, sửa, gửi duyệt, ngừng khách sạn; quản lý loại phòng và tồn kho.
- Xem đặt phòng, nhận phòng, trả phòng, xử lý yêu cầu hủy; doanh thu theo tháng.
- Phản hồi đánh giá của khách.

**Quản trị viên (bảng điều khiển web)**
- Duyệt chủ khách sạn và khách sạn.
- Tìm kiếm, khóa, mở khóa người dùng; ẩn đánh giá vi phạm.
- Xem thống kê, đặt phòng, thanh toán, nhật ký thao tác; trả lời yêu cầu hỗ trợ.

---

## Kiến trúc

```
 Ứng dụng iOS (SwiftUI, MVVM)        Bảng điều khiển (React, Vite)
            │                                   │
            └──────────────┬────────────────────┘
                           ▼
          REST API: NestJS 11, Docker trên Render
   auth · users · account · hotels · room-types · bookings
   payments · reviews · owners · admin · notifications
   recommendations (LightGBM từ tệp JSON, có bộ xếp hạng dự phòng)
                           │
                           ▼
                 MongoDB Atlas (replica set)

 Dịch vụ ngoài: payOS · Google/Apple ID token · Open-Meteo (gọi từ iOS)
```

### Đặt phòng không bán trùng

- Kỳ lưu trú là khoảng nửa mở `[checkIn, checkOut)`; ngày trả phòng không chiếm tồn kho.
- Mỗi yêu cầu đặt phòng mang khóa `Idempotency-Key` (UUID). Gửi lại cùng khóa và cùng nội dung trả về đặt phòng cũ; cùng khóa khác nội dung trả 409.
- Trong một giao dịch MongoDB, máy chủ tăng `inventoryVersion` của loại phòng, nên các yêu cầu đặt cùng loại phòng chạy tuần tự. Sau đó máy chủ đếm phòng trống theo từng đêm rồi mới tạo đặt phòng.
- Giữ phòng 15 phút; quá hạn thì đặt phòng chuyển sang `EXPIRED`.

### Trạng thái đặt phòng

```
PENDING_PAYMENT ──► CONFIRMED ──► CHECKED_IN ──► CHECKED_OUT
      │                 │
      ├──► CANCELLED    └──► CANCEL_REQUESTED ──► CANCELLED
      └──► EXPIRED
```

`PAID`, `COMPLETED` và `REFUNDED` đã được khai báo nhưng chưa có luồng sử dụng; hoàn tiền tự động chưa được cài đặt.

### Gợi ý khách sạn

- Máy chủ lọc ứng viên theo điểm đến và bộ lọc, rồi tính 16 đặc trưng từ lượt xem (trọng số giảm một nửa sau 14 ngày) và đặt phòng.
- Mô hình LightGBM LambdaRank được huấn luyện bằng Python, xuất ra JSON và chấm điểm bằng TypeScript ngay trong tiến trình NestJS (`backend/src/recommendations/models/hotelia-lgbm.active.json`).
- Nếu tệp mô hình lỗi hoặc thiếu, API chuyển sang bộ xếp hạng theo nội dung.
- Mô hình mới được đánh giá ngoại tuyến trên dữ liệu sinh, trước khi có người dùng thật. Chi tiết ở `docs/Recommendation.md` và `docs/LightGBM-Training-Process.md`.

---

## Công nghệ

| Phần | Công nghệ |
|---|---|
| iOS | Swift 5, SwiftUI, MVVM, Keychain, String Catalog; iOS 26.2; Xcode 26 |
| Máy chủ | Node.js 20, NestJS 11, TypeScript 5.9, Mongoose 8, Jest 30 |
| Cơ sở dữ liệu | MongoDB Atlas; giao dịch cần replica set |
| Bảng điều khiển | React 18, Vite, React Router 6, Axios, Recharts |
| Học máy | Python 3, LightGBM 4.7, pandas, Polars, scikit-learn, pytest |
| Hạ tầng | Render (Docker, `render.yaml`), Vercel, MongoDB Atlas |
| Thanh toán | payOS (VietQR, webhook ký HMAC-SHA256) |

---

## Cấu trúc thư mục

```
.
├── DuLich/                 # Ứng dụng iOS (App/, Core/, Localizable.xcstrings)
├── DuLich.xcodeproj        # Dự án Xcode, scheme "Hotelia"
├── backend/                # API NestJS
│   ├── src/                # auth, users, account, hotels, bookings, payments,
│   │                       # reviews, owners, admin, notifications, recommendations
│   ├── scripts/            # kiểm thử tranh chấp trên MongoDB thật, kích hoạt danh mục
│   ├── public/media/       # ảnh khách sạn và phòng do API phục vụ
│   └── Dockerfile
├── hotelia-dashboard/      # Bảng điều khiển chủ khách sạn và quản trị viên (đang dùng)
├── hotelia-web/            # Bản admin cũ, không còn triển khai
├── research/               # Huấn luyện và đánh giá LightGBM (Python)
├── docs/                   # Tài liệu kỹ thuật: gợi ý, payOS, bảo mật, đăng nhập mạng xã hội
├── report-latex/           # Báo cáo đồ án (LaTeX)
└── render.yaml             # Cấu hình triển khai API trên Render
```

---

## Chạy trên máy

### Yêu cầu

- macOS với Xcode 26 (để chạy ứng dụng iOS)
- Node.js 20
- Docker (để chạy MongoDB)
- Python 3 (chỉ khi huấn luyện lại mô hình)

### 1. MongoDB dạng replica set

Đặt phòng và thanh toán dùng giao dịch MongoDB, nên cần replica set. Tệp `backend/docker-compose.yml` chạy MongoDB một nút đơn, không hỗ trợ giao dịch. Có thể dùng:

```bash
docker run -d --name hotelia-mongo -p 27018:27017 mongo:7.0 --replSet rs0 --bind_ip_all
```

```bash
docker exec hotelia-mongo mongosh --quiet --eval 'rs.initiate()'
```

### 2. Máy chủ

```bash
cd backend
npm install
cp .env.example .env
```

Trong `backend/.env`, đặt `MONGODB_URI=mongodb://127.0.0.1:27018/hotelia?directConnection=true` và một `JWT_SECRET` ngẫu nhiên dài ít nhất 32 ký tự. Khóa payOS và mã ứng dụng Google/Apple chỉ cần khi thử các chức năng đó. Các biến khác được mô tả ngay trong `.env.example`.

```bash
npm run start:dev
```

API chạy tại `http://localhost:3000/api/v1`; tài liệu Swagger ở `http://localhost:3000/docs` (chỉ bật ngoài môi trường vận hành).

`backend/seed.js` nạp dữ liệu mẫu nhưng **xóa toàn bộ cơ sở dữ liệu** trước khi nạp; chỉ chạy trên cơ sở dữ liệu thử nghiệm.

### 3. Bảng điều khiển

```bash
cd hotelia-dashboard
npm install
echo "VITE_API_URL=http://localhost:3000/api/v1" > .env
npm run dev
```

Ngoài môi trường vận hành, máy chủ đã cho phép sẵn `http://localhost:5173`–`5175`; địa chỉ khác cần thêm vào `CORS_ORIGINS`.

### 4. Ứng dụng iOS

Mở `DuLich.xcodeproj`, chọn scheme **Hotelia** và chạy trên Simulator. Địa chỉ API lấy từ build setting `HOTELIA_API_BASE_URL`: cấu hình Release trỏ tới `https://api.hotelia.asia/api/v1`; cấu hình Debug trỏ tới máy phát triển, cần đổi thành địa chỉ máy chủ của bạn.

---

## Kiểm thử

```bash
cd backend
npm test                                  # 57 ca Jest, 14 bộ
npm run build && npm run test:booking-db  # tranh chấp đặt phòng trên MongoDB thật (cổng 27018)
```

```bash
cd research
python3 -m venv venv && venv/bin/pip install -r requirements.txt
venv/bin/python -m pytest tests
```

Ứng dụng iOS chưa có bộ kiểm thử giao diện tự động; `tests/ExploreRefreshRegression.swift` là kiểm tra hồi quy cho màn Khám phá.

---

## Bảo mật

- Access token sống 15 phút; refresh token 7 ngày, xoay vòng mỗi lần làm mới. Máy chủ chỉ lưu bản băm SHA-256 của refresh token; đăng xuất thu hồi refresh token trên máy chủ.
- Claim `typ` phân biệt access token và refresh token; đổi hoặc đặt lại mật khẩu làm mọi phiên cũ mất hiệu lực (`tokenVersion`).
- Mật khẩu băm bằng bcrypt (12 vòng); khóa tài khoản 15 phút sau 5 lần sai; giới hạn 100 yêu cầu mỗi phút.
- ID token Google/Apple được máy chủ tự xác minh bằng JWKS; Apple dùng thêm nonce.
- Phân quyền theo vai trò USER, OWNER, ADMIN, kèm kiểm tra quyền sở hữu khách sạn trong từng dịch vụ.
- Mọi đầu vào qua `ValidationPipe`; trường lạ bị từ chối.
- Thanh toán chỉ được xác nhận qua webhook payOS có chữ ký hợp lệ và đúng số tiền.
- Thao tác ghi của người đã đăng nhập được ghi vào `audit_logs`.

---

## Giới hạn hiện tại

- Mô hình gợi ý chưa được huấn luyện hay đánh giá trên hành vi người dùng thật.
- 80 trong 100 khách sạn có giá, tồn kho và chủ khách sạn mô phỏng; điểm hiển thị là điểm biên tập.
- payOS chưa được thử với giao dịch thật; chưa có hoàn tiền tự động.
- Bảng điều khiển chỉ có tiếng Việt.
- Hạ tầng dùng gói miễn phí; API trên Render có thể mất khoảng 20 giây cho yêu cầu đầu tiên sau khi ngủ.

---

## Tác giả

**Nguyễn Duy Hiệu**
- GitHub: [@NguyenDuyHieu49](https://github.com/NguyenDuyHieu49)
- Email: nguyenduyhieuwork49@gmail.com

