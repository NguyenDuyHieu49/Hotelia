# Review Hotelia — 24/09/2026

Kiến trúc SwiftUI → NestJS/MongoDB + Python ranking hợp lý cho đồ án. Hiện trạng chưa đủ đúng để coi booking end-to-end và benchmark recommendation đã hoàn tất. Review snapshot HEAD 5ae52e1; không sửa source; không chạy DB thật, load test hoặc UI tương tác. PDF là hướng dẫn có hai lựa chọn chuyên sâu, không buộc triển khai cả hai ngang nhau. Các finding ML đánh giá phần ML đã hiện diện trong repo.

## Kiểm chứng

- Backend: npm run build PASS.
- hotelia-web: npm run build PASS.
- hotelia-dashboard: npm run build FAIL (22 lỗi TypeScript: import dư, HotelUser không export, CardProps thiếu onClick, StatCard color yellow không hợp lệ).
- Research: 67 tests PASS, 18 warnings; kiểm tra đối chứng vẫn phát hiện lỗi nhãn và metric.
- Backend: npm test -- --runInBand không tìm thấy test.
- iOS Simulator: BUILD SUCCEEDED với scheme Hotelia, Debug, CODE_SIGNING_ALLOWED=NO; chưa chạy UI trên Simulator.

## Standards

### S1 [P1] Khách sạn được công khai trước khi admin duyệt

[backend/src/hotels/hotels.service.ts:17](/Users/macbookpro/Documents/DoAnCoSo/backend/src/hotels/hotels.service.ts:17)

create() gán PUBLISHED vô điều kiện. Owner có thể đưa khách sạn vào kết quả public ngay sau POST, bỏ qua submit/approve.

**Đối chiếu:** SDD_DuLich.md:75 — mỗi khách sạn phải được admin duyệt trước khi hiển thị.

**Hướng sửa:** Khởi tạo DRAFT/PENDING_APPROVAL; chỉ luồng duyệt được chuyển sang PUBLISHED.

### S2 [P1] Người chưa lưu trú vẫn có thể đánh giá

[backend/src/reviews/reviews.service.ts:15](/Users/macbookpro/Documents/DoAnCoSo/backend/src/reviews/reviews.service.ts:15)

Chỉ kiểm tra user đã review hotel chưa; bookingId tùy chọn, không xác minh đơn thuộc user, đúng hotel và đã hoàn tất. Review được lưu và cập nhật rating.

**Đối chiếu:** SDD_DuLich.md:80 — review sau booking COMPLETED.

**Hướng sửa:** Xác minh booking đủ điều kiện trên server và ràng buộc uniqueness theo chính sách review.

### S3 [P1] Dashboard owner tải nhầm đơn của chính owner với vai trò khách

[hotelia-dashboard/src/features/owner/OwnerBookings.tsx:34](/Users/macbookpro/Documents/DoAnCoSo/hotelia-dashboard/src/features/owner/OwnerBookings.tsx:34)

getMyBookings() gọi /bookings, backend lọc userId hiện tại. Đơn của khách ở khách sạn owner quản lý không xuất hiện. API owner/getHotelBookings đã tồn tại nhưng không được dùng ở đây.

**Đối chiếu:** SDD_DuLich.md:111 — owner quản lý booking khách sạn.

**Hướng sửa:** Tải booking theo khách sạn thuộc owner; xử lý owner có nhiều khách sạn.

### S4 [P2] Tìm kiếm bỏ qua điều kiện đặt phòng

[backend/src/hotels/hotels.service.ts:64](/Users/macbookpro/Documents/DoAnCoSo/backend/src/hotels/hotels.service.ts:64)

DTO nhận ngày, số khách/phòng, khoảng giá và amenities nhưng search chỉ lọc trạng thái, destination và rating. Price sort dùng minPrice không tồn tại trong Hotel schema. Có thể trả khách sạn không phù hợp hoặc hết phòng.

**Đối chiếu:** SDD_DuLich.md:145–148; DuLich/docs/SPEC.md §1.2.

**Hướng sửa:** Lọc room type/inventory đủ điều kiện cho toàn bộ kỳ ở, dùng quote để lọc và sắp xếp giá.

### S5 [P2] Các nút thao tác trạng thái chưa nối API

[DuLich/Core/Booking/BookingDetailView.swift:221](/Users/macbookpro/Documents/DoAnCoSo/DuLich/Core/Booking/BookingDetailView.swift:221)

Nút hủy iOS có closure rỗng. OwnerBookings.tsx:221–230 cũng có nút xác nhận/check-in thiếu handler. UI cho phép bấm nhưng không thực hiện nghiệp vụ.

**Đối chiếu:** Luồng quản lý booking trong SDD; PDF §2.1.

**Hướng sửa:** Nối API phù hợp với trạng thái, cập nhật giao diện sau thành công và hiển thị lỗi.

## Spec

### B1 [P1] Tạo booking không giữ tồn phòng hoặc chống đặt trùng

[backend/src/bookings/bookings.service.ts:34](/Users/macbookpro/Documents/DoAnCoSo/backend/src/bookings/bookings.service.ts:34)

create() chỉ insert booking; không gọi reserveRooms, không transaction theo từng đêm, không idempotency hay hold expiry. Hai lần tạo cùng loại phòng/ngày vẫn tạo hai đơn mà không kiểm tra capacity. Mock source cô lập xác nhận hai lần đều save; chưa chạy race trên MongoDB.

**Đối chiếu:** PDF §2.1, §4.2–4.6; DuLich/docs/SPEC.md §2.3, §3.

**Hướng sửa:** Xây hold transaction theo room-night, điều kiện available >= quantity, unique actor/key + payload hash; confirm/expire/cancel giải phóng hoặc chuyển tồn đúng một lần.

### B2 [P1] Giá đơn bị cố định 100 mỗi đêm và không kiểm chứng loại phòng

[backend/src/bookings/bookings.service.ts:31](/Users/macbookpro/Documents/DoAnCoSo/backend/src/bookings/bookings.service.ts:31)

Server dùng roomPrice=100; không đọc room type để kiểm tra basePrice, hotelId, isActive, maxGuests. Giá thanh toán lấy booking.totalPrice nên có thể khác giá người dùng xem. Một roomTypeId hợp lệ về cú pháp có thể không thuộc hotel đang đặt.

**Đối chiếu:** PDF §2.1, §3.9: giá server tính từ quote hợp lệ; SDD quy tắc booking.

**Hướng sửa:** Tải room type theo hotel, kiểm tra khả dụng/sức chứa; tạo quote snapshot gồm giá, tiền tệ, phí, số phòng và số đêm.

### B3 [P1] Luồng thanh toán → xác nhận → check-in bị đứt

[backend/src/payments/payments.service.ts:101](/Users/macbookpro/Documents/DoAnCoSo/backend/src/payments/payments.service.ts:101)

confirm() chỉ chuyển PAID; checkIn() chỉ chấp nhận CONFIRMED. Không có caller chuyển PAID → CONFIRMED. Swift RoomBookingView.swift:351–362 chỉ tạo đơn rồi dismiss, không gọi /payments. Mock xác nhận PAID không được check-in.

**Đối chiếu:** SDD_DuLich.md:456 (PAID → CONFIRMED tự động); PDF §2.1 yêu cầu xác nhận thanh toán giả lập.

**Hướng sửa:** Hoàn thiện luồng payment giả lập ở iOS và transition server hợp lệ, có trạng thái kết quả rõ ràng.

### B4 [P1] Callback thanh toán có thể làm payment và booking bất nhất

[backend/src/payments/payments.service.ts:97](/Users/macbookpro/Documents/DoAnCoSo/backend/src/payments/payments.service.ts:97)

Payment được lưu COMPLETED trước khi đổi booking. Callback đến sau cancel để payment COMPLETED nhưng booking CANCELLED rồi báo lỗi; replay ném PAID → PAID. Callback public ở payments.controller.ts:40–46 chỉ cần transactionId, chưa kiểm chứng event/amount/provider. Đây là giới hạn ngay cả với mô phỏng nếu muốn thử duplicate/late events.

**Đối chiếu:** PDF §4.6, trang in 16: event ID, xác thực callback, transition có điều kiện và reconciliation khi đến muộn.

**Hướng sửa:** Deduplicate payment event; kiểm chứng liên kết và giá trị; transaction/conditional update cho trạng thái; xử lý refund/reconciliation khi callback muộn.

### B5 [P2] Hủy đơn CONFIRMED luôn bị state machine từ chối

[backend/src/bookings/bookings.service.ts:77](/Users/macbookpro/Documents/DoAnCoSo/backend/src/bookings/bookings.service.ts:77)

canCancel(CONFIRMED)=true nhưng cancel() yêu cầu chuyển trực tiếp CANCELLED, trong khi bảng transition chỉ cho CANCEL_REQUESTED. Người dùng nhận lỗi ở trạng thái được cho phép hủy.

**Đối chiếu:** SDD_DuLich.md:458; BookingStateService transition CONFIRMED.

**Hướng sửa:** Đồng bộ canCancel, trạng thái đích, chính sách hủy và flow hoàn tiền; không chỉ đổi enum để bỏ lỗi.

### M1 [P1] Dữ liệu huấn luyện không phải bài toán xếp hạng khách sạn

[research/scripts/train_lgb.py:81](/Users/macbookpro/Documents/DoAnCoSo/research/scripts/train_lgb.py:81)

prepare() giữ các event clickout thay vì bung impressions thành candidate rows. build_labels() gán mọi clickout bằng 1. Kiểm tra artifact hiện tại: 100.000 event → 9.280 mẫu ranking, nhãn duy nhất [1], 5.001 group. Model đã lưu chỉ có 1 cây, thử 3 ứng viên đều score=0.

**Đối chiếu:** PDF §3.6, trang in 7: một query nhiều candidate, đúng một positive.

**Hướng sửa:** Tạo query theo target clickout và từng candidate; positive là candidate==reference, còn lại 0; group liên tiếp theo query, join metadata/price từng item.

### M2 [P1] Feature phiên nhìn cả tương lai và chưa có temporal validation

[research/scripts/features.py:158](/Users/macbookpro/Documents/DoAnCoSo/research/scripts/features.py:158)

Session stats và last_action tính trên toàn bộ session rồi join ngược từng dòng; target trước đó thấy các hành động tương lai. train_model() fit toàn bộ train_features; val_split được khai báo nhưng không dùng. Chưa có pipeline temporal train/validation/test theo query như PDF.

**Đối chiếu:** PDF §3.5.2–3.6: không dùng bước sau target; chia train/validation/test liên tiếp theo thời gian.

**Hướng sửa:** Chốt target/query, chỉ tính prefix trước target; tách theo mốc thời gian và session; fit aggregate/vocabulary chỉ trên tập train.

### M3 [P1] Bộ đánh giá loại ứng viên sai và làm điểm cao giả

[research/scripts/evaluate.py:167](/Users/macbookpro/Documents/DoAnCoSo/research/scripts/evaluate.py:167)

Evaluator xóa item không có trong ground truth trước khi chấm. Test cô lập: [wrong1, wrong2, target], ground truth chỉ target → MRR@5=1 thay vì 1/3. main() dùng reference của test công khai làm nhãn dù nhiều target bị ẩn; 770 clickout ẩn trong mẫu 10.000 dòng đầu test.zip. Điểm B0 khoảng 0,99 trong results.json chưa phải bằng chứng chất lượng.

**Đối chiếu:** PDF §3.4, §3.6, §3.8: giữ candidate đầy đủ, ground truth hợp lệ, giao thức test khóa.

**Hướng sửa:** Giữ nguyên ranking đầy đủ; tạo temporal holdout từ train có nhãn; tính IDCG từ tập nhãn chuẩn; kiểm tra coverage/query count, so sánh đủ baseline cùng split.

### M4 [P1] Serving không phân biệt khách sạn và feature không khớp train

[research/scripts/serving.py:138](/Users/macbookpro/Documents/DoAnCoSo/research/scripts/serving.py:138)

Vòng lặp item_id đưa cùng vector context + hằng số cho mọi candidate; không có giá/content/session theo item. platform lúc train là mã quốc gia AU/CO/DE..., serving lại ios/android/web. Swift ExploreService.swift:46 lấy hash hotel ID làm cityId, không phải city hash lúc train. Dù train được model tốt, request hiện tại vẫn không rerank ứng viên khác nhau bằng feature thật.

**Đối chiếu:** PDF §3.9: model/feature version nhất quán, context và prefix events, candidate hợp lệ do API dựng.

**Hướng sửa:** Dùng cùng feature builder/vocabulary cho offline-online; truyền candidate features từ catalog/quote và prefix; không nối ID Trivago với catalog demo khi chưa có mapping.

## Tài liệu và phạm vi dữ liệu

Booking_App.pdf: 30 trang; đã trích xuất nội dung và xem trực quan trang vật lý 10/19 chứa pipeline và vòng đời hold. Các ZIP được đọc header và mẫu 10.000 dòng đầu, không giải nén toàn bộ hay huấn luyện lại. train/test có user_id, session_id, action_type, impressions, prices; metadata có item_id/properties; submission_popular có item_recommendations. Schema phù hợp Trivago, không phải Expedia Personalized Sort. submission_popular là đầu ra dự đoán tham chiếu, không phải nhãn thật. research/docs/SPEC.md hiện gọi Expedia nhưng mô tả Trivago; cần thống nhất cùng giao thức nhãn/prefix trong PDF trước khi chạy benchmark.

## Ưu tiên triển khai

1. Booking: quote + validation room type → hold/inventory/idempotency → payment state machine → UI payment/cancel.
2. ML: query/candidates/labels → temporal split/prefix → evaluator đúng → huấn luyện baseline/model → serving đồng nhất feature.
3. Sửa dashboard build, API owner, duyệt hotel/review; thêm integration tests bao phủ workflow.

Tổng: Standards 5 phát hiện (rủi ro lớn: bỏ duyệt hotel/điều kiện review); Spec 9 phát hiện (rủi ro lớn: không giữ tồn phòng; pipeline ranking và metric sai).
