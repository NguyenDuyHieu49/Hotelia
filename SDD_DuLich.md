# SOFTWARE DESIGN DOCUMENT
## DuLich - Nền tảng đặt phòng du lịch

**Version:** 1.0  
**Date:** 02/09/2026  
**Author:** Nguyễn Duy Hiệu

---

## MỤC LỤC

1. [Project Overview](#1-project-overview)
2. [Business Requirements](#2-business-requirements)
3. [Actors & Roles](#3-actors--roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-functional Requirements](#5-non-functional-requirements)
6. [User Flow](#6-user-flow)
7. [Hotel Owner Flow](#7-hotel-owner-flow)
8. [Admin Flow](#8-admin-flow)
9. [Booking State Machine](#9-booking-state-machine)
10. [Payment Flow](#10-payment-flow)
11. [Availability Architecture](#11-availability-architecture)
12. [Concurrency Strategy](#12-concurrency-strategy)
13. [MongoDB Data Model](#13-mongodb-data-model)
14. [ERD](#14-erd)
15. [MongoDB Index Strategy](#15-mongodb-index-strategy)
16. [REST API Architecture](#16-rest-api-architecture)
17. [API Specification](#17-api-specification)
18. [Authentication](#18-authentication)
19. [Authorization](#19-authorization)
20. [Security Architecture](#20-security-architecture)
21. [Notification Architecture](#21-notification-architecture)
22. [Image Storage Architecture](#22-image-storage-architecture)
23. [SwiftUI Architecture](#23-swiftui-architecture)
24. [NestJS Architecture](#24-nestjs-architecture)
25. [Deployment Architecture](#25-deployment-architecture)
26. [Free Infrastructure](#26-free-infrastructure)
27. [Cost Analysis](#27-cost-analysis)
28. [Testing Strategy](#28-testing-strategy)
29. [Development Roadmap](#29-development-roadmap)

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
**DuLich** - Nền tảng đặt phòng khách sạn trực tuyến

### 1.2 Project Type
- **Mobile Application:** iOS (SwiftUI)
- **Backend:** NestJS (Node.js)
- **Database:** MongoDB with Mongoose
- **Architecture:** Modular Monolith

### 1.3 Project Description
Nền tảng trung gian kết nối người dùng với các chủ khách sạn, cho phép tìm kiếm, đặt phòng và thanh toán trực tuyến. Tương tự phiên bản thu gọn của Booking.com/Agoda.

### 1.4 Project Goals
- Cung cấp trải nghiệm đặt phòng đơn giản và thuận tiện
- Quản lý khách sạn hiệu quả cho chủ khách sạn
- Quản lý hệ thống toàn diện cho admin
- Đảm bảo bảo mật và tính toàn vẹn dữ liệu
- Chi phí vận hành $0 cho MVP

---

## 2. BUSINESS REQUIREMENTS

### 2.1 Core Business Model
- **Mô hình:** Nền tảng trung gian (Marketplace)
- **Nguồn thu:** Commission trên mỗi booking (MVP: 0%)
- **Đối tượng:** Người dùng cá nhân, chủ khách sạn, admin

### 2.2 Business Rules
1. Mỗi khách sạn phải được duyệt bởi admin trước khi hiển thị
2. Mỗi chủ khách sạn phải được phê duyệt trước khi tạo khách sạn
3. Đặt phòng chỉ được xác nhận khi thanh toán thành công
4. Không cho phép double booking (2 người đặt cùng 1 phòng cùng thời điểm)
5. Hủy phòng chỉ được hoàn tiền nếu đủ điều kiện
6. Review chỉ được viết sau khi booking hoàn thành

---

## 3. ACTORS & ROLES

### 3.1 USER
Người dùng cuối tìm kiếm và đặt phòng khách sạn.

**Quyền hạn:**
- Đăng ký/đăng nhập
- Tìm kiếm khách sạn
- Xem chi tiết khách sạn
- Đặt phòng
- Thanh toán
- Xem lịch sử booking
- Hủy booking (đủ điều kiện)
- Check-in/check-out
- Viết review
- Nhận notification

### 3.2 HOTEL_OWNER
Chủ khách sạn quản lý khách sạn của mình.

**Quyền hạn:**
- Tất cả quyền của USER
- Đăng ký trở thành Hotel Owner
- Tạo và quản lý khách sạn
- Upload hình ảnh
- Quản lý loại phòng và giá
- Quản lý availability
- Xem booking của khách sạn
- Check-in/check-out khách
- Xem doanh thu
- Xem và phản hồi review
- Nhận notification

### 3.3 ADMIN
Quản trị viên hệ thống.

**Quyền hạn:**
- Tất cả quyền
- Duyệt/từ chối Hotel Owner
- Duyệt/từ chối Hotel
- Quản lý toàn bộ users
- Quản lý toàn bộ bookings
- Quản lý payments và refunds
- Quản lý reviews và complaints
- Xem thống kê
- Khóa tài khoản
- Suspend hotel
- Xem audit log

---

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Authentication
- Đăng ký với email/password
- Đăng nhập với email/password
- JWT token với refresh token rotation
- Quên mật khẩu
- Đăng xuất

### 4.2 User Features
- Tìm kiếm theo địa điểm
- Chọn ngày check-in/check-out
- Chọn số khách
- Lọc theo giá, rating, tiện nghi
- Sắp xếp kết quả
- Xem chi tiết khách sạn
- Xem hình ảnh (carousel)
- Xem tiện nghi
- Xem vị trí trên bản đồ
- Xem loại phòng và giá
- Kiểm tra availability
- Đặt phòng
- Thanh toán (Mock)
- Xem lịch sử booking
- Hủy booking
- Check-in/check-out
- Viết review

### 4.3 Hotel Owner Features
- Đăng ký trở thành Hotel Owner
- Tạo khách sạn (sau khi được duyệt)
- Chỉnh sửa thông tin khách sạn
- Upload hình ảnh
- Quản lý tiện nghi
- Quản lý loại phòng
- Quản lý số lượng phòng
- Quản lý giá
- Quản lý availability
- Xem booking
- Xem thông tin khách hàng
- Check-in/check-out
- Xem doanh thu
- Xem review

### 4.4 Admin Features
- Dashboard với thống kê
- Quản lý users
- Duyệt Hotel Owners
- Duyệt Hotels
- Quản lý bookings
- Quản lý payments
- Quản lý refunds
- Quản lý reviews
- Quản lý complaints
- Xem audit log
- Khóa tài khoản
- Suspend hotel

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Performance
- API response time < 500ms
- App launch time < 3s
- Search response < 1s

### 5.2 Security
- JWT với short expiry
- Password hashing với bcrypt/Argon2
- Input validation
- Rate limiting
- CORS configuration
- HTTPS everywhere

### 5.3 Scalability
- Hỗ trợ 1000 concurrent users (MVP)
- Có thể mở rộng sau

### 5.4 Reliability
- 99.9% uptime
- Data backup
- Error handling

### 5.5 Maintainability
- Clean code
- Documentation
- Unit tests

---

## 6. USER FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ Splash  │
    └────┬────┘
         │
         ▼
    ┌─────────┐      ┌─────────┐
    │  Login  │──────│ Register│
    └────┬────┘      └────┬────┘
         │                │
         └───────┬────────┘
                 │
                 ▼
          ┌───────────┐
          │   Home    │
          │  Search   │
          └─────┬─────┘
                │
                ▼
         ┌──────────────┐
         │Search Results│
         └──────┬───────┘
                │
                ▼
    ┌───────────────────────┐
    │   Hotel Detail        │
    │   - Images            │
    │   - Amenities         │
    │   - Map               │
    │   - Room Types        │
    │   - Reviews           │
    └──────────┬────────────┘
               │
               ▼
       ┌───────────────┐
       │Room Selection │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │Guest Info     │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │Booking Summary│
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │   Payment     │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │  Confirmation │
       └───────┬───────┘
               │
               ▼
          ┌─────────┐
          │ My Trips │
          └────┬────┘
               │
               ├──► Check-in ──► Stay ──► Check-out ──► Complete ──► Review
               │
               └──► Cancel (if eligible)
```

---

## 7. HOTEL OWNER FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOTEL OWNER FLOW                             │
└─────────────────────────────────────────────────────────────────┘

REGISTRATION:
    ┌─────────────┐
    │   Register  │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Apply Owner │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   PENDING   │◄──── Waiting for admin approval
    └──────┬──────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 APPROVE      REJECT
    │             │
    ▼             ▼
DASHBOARD     Appeal
              (optional)

HOTEL MANAGEMENT:
    ┌─────────────┐
    │Create Hotel │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   DRAFT     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐     ┌─────────────┐
    │   Submit    │────►│ PENDING_    │
    └─────────────┘     │ APPROVAL    │
                        └──────┬──────┘
                               │
                        ┌──────┴──────┐
                        │             │
                        ▼             ▼
                     APPROVE      REJECT
                        │             │
                        ▼             ▼
                   PUBLISHED     Edit &
                                Resubmit

DAILY OPERATIONS:
    ┌─────────────┐
    │  Dashboard  │
    └──────┬──────┘
           │
           ├──► View Bookings
           ├──► Check-in Guest
           ├──► Check-out Guest
           ├──► Update Availability
           ├──► View Revenue
           └──► Respond to Reviews
```

---

## 8. ADMIN FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │  Dashboard  │
    └──────┬──────┘
           │
           ├──────────────────────────────────────────────────┐
           │                                                  │
           ▼                                                  ▼
    ┌─────────────┐                                    ┌─────────────┐
    │ Owner       │                                    │ Hotel       │
    │ Approvals   │                                    │ Approvals   │
    └──────┬──────┘                                    └──────┬──────┘
           │                                                   │
           ▼                                                   ▼
    ┌─────────────┐                                    ┌─────────────┐
    │ • Approve   │                                    │ • Approve   │
    │ • Reject    │                                    │ • Reject    │
    │ • View docs │                                    │ • View      │
    └─────────────┘                                    └─────────────┘
           │                                                   │
           └───────────────────┬───────────────────────────────┘
                               │
                               ▼
                       ┌─────────────┐
                       │Statistics   │
                       │Management   │
                       └──────┬──────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐            ┌─────────┐            ┌─────────┐
│ Users   │            │ Bookings│            │ Reports │
└─────────┘            └─────────┘            └─────────┘
```

---

## 9. BOOKING STATE MACHINE

### 9.1 States

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT

    PENDING_PAYMENT --> PAID: Payment Success
    PENDING_PAYMENT --> CANCELLED: User Cancel
    PENDING_PAYMENT --> EXPIRED: 15 min timeout

    PAID --> CONFIRMED: Auto Confirm
    PAID --> REFUNDED: Admin Refund (rare)

    CONFIRMED --> CHECKED_IN: Owner Check-in
    CONFIRMED --> CANCEL_REQUESTED: User Cancel

    CHECKED_IN --> CHECKED_OUT: Owner Check-out

    CHECKED_OUT --> COMPLETED: Auto Complete

    CANCEL_REQUESTED --> REFUNDED: Admin Approve
    CANCEL_REQUESTED --> CANCELLED: Admin Deny

    CANCELLED --> [*]
    COMPLETED --> [*]
    REFUNDED --> [*]
    EXPIRED --> [*]
```

### 9.2 State Transition Rules

| From State | To State | Trigger | Who | Conditions |
|------------|----------|---------|-----|------------|
| - | PENDING_PAYMENT | Create booking | System | - |
| PENDING_PAYMENT | PAID | Payment success | System | Valid payment |
| PENDING_PAYMENT | CANCELLED | User cancel | User | Before payment |
| PENDING_PAYMENT | EXPIRED | Timeout | System | 15 min timeout |
| PAID | CONFIRMED | Auto | System | After payment verify |
| CONFIRMED | CHECKED_IN | Check-in | Owner | Guest arrival |
| CONFIRMED | CANCEL_REQUESTED | User cancel | User | Before check-in |
| CHECKED_IN | CHECKED_OUT | Check-out | Owner | Guest leave |
| CHECKED_OUT | COMPLETED | Auto | System | After checkout |
| CANCEL_REQUESTED | REFUNDED | Admin approve | Admin | Valid refund request |
| CANCEL_REQUESTED | CANCELLED | Admin deny | Admin | Invalid/cancelled |

### 9.3 Cancellation Policy

| Booking Status | Cancel Allowed | Refund |
|---------------|----------------|--------|
| PENDING_PAYMENT | Yes | 100% |
| PAID | Yes | 100% if 7+ days before check-in |
| PAID | Yes | 50% if 3-7 days before |
| CONFIRMED | Yes | 50% if 3-7 days before |
| CONFIRMED | No | No refund if < 3 days |
| CHECKED_IN | No | No refund |

---

## 10. PAYMENT FLOW

### 10.1 Mock Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend
    participant P as MockPayment

    Note over U,P: MOCK PAYMENT FLOW

    U->>FE: Confirm Booking
    FE->>API: POST /bookings
    API->>API: Create booking (PENDING_PAYMENT)
    API-->>FE: { bookingId, amount, status }
    FE->>FE: Show Payment Options

    alt MoMo Mock
        U->>FE: Select MoMo
        FE->>API: POST /payments
        API->>P: Create mock transaction
        P-->>API: { transactionId, mockDeepLink }
        API-->>FE: { paymentUrl }
        FE->>FE: Open mockDeepLink

        Note over U: User "pays" in mock UI
        U->>FE: Confirm Payment
        FE->>API: POST /payments/webhook
    end

    alt VNPay Mock
        U->>FE: Select VNPay
        FE->>API: POST /payments
        API->>P: Create mock transaction
        P-->>API: { transactionId, mockUrl }
        API-->>FE: { paymentUrl }
        FE->>FE: Open mockUrl

        Note over U: User "pays" in mock UI
        U->>FE: Confirm Payment
        FE->>API: POST /payments/webhook
    end

    alt Cash Mock
        U->>FE: Select Cash
        FE->>API: POST /payments
        API->>API: Create mock payment (SUCCESS after delay)
    end

    API->>API: Verify payment
    API->>API: Update booking to PAID
    API->>API: Update availability (atomic)
    API-->>FE: Payment confirmed
    FE->>FE: Show success & booking details
```

### 10.2 Payment Adapter Pattern

```typescript
// Interface
interface IPaymentProvider {
  createPayment(booking: Booking, userId: string): Promise<PaymentRequest>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
  refund(bookingId: string, amount: number): Promise<RefundResult>;
}

// Implementations
class MockPaymentProvider implements IPaymentProvider { }
class MoMoPaymentProvider implements IPaymentProvider { }
class VNPayPaymentProvider implements IPaymentProvider { }

// Factory
class PaymentProviderFactory {
  static create(type: PaymentMethod): IPaymentProvider {
    switch (type) {
      case 'MOCK_MOMO': return new MockPaymentProvider();
      case 'MOCK_VNPAY': return new MockPaymentProvider();
      case 'MOCK_CASH': return new MockPaymentProvider();
      case 'MOMO': return new MoMoPaymentProvider();
      case 'VNPAY': return new VNPayPaymentProvider();
      default: throw new Error('Invalid payment method');
    }
  }
}
```

---

## 11. AVAILABILITY ARCHITECTURE

### 11.1 Option Comparison

| Criteria | Option A: Calculate from Bookings | Option B: Pre-calculated |
|----------|----------------------------------|--------------------------|
| Performance | Slow (query all bookings) | Fast (O(1) lookup) |
| Complexity | Simple | More complex |
| Data Consistency | Always consistent | Needs sync |
| Concurrent Write | Hard to handle | Easy with atomic update |
| Storage | No extra | Extra collection |

### 11.2 Selected: Option B - Pre-calculated Availability

```javascript
// Collection: roomAvailability
{
  _id: ObjectId,
  roomTypeId: ObjectId,      // Reference to room type
  date: ISODate,            // Specific date (normalized to midnight)
  totalRooms: Number,       // Total rooms of this type
  bookedRooms: Number,       // Rooms currently booked
  availableRooms: Number,    // Available = total - booked
  version: Number,           // For optimistic locking
  updatedAt: ISODate
}

// Compound unique index
db.roomAvailability.createIndex(
  { roomTypeId: 1, date: 1 },
  { unique: true }
)

// Query optimization index
db.roomAvailability.createIndex(
  { date: 1, availableRooms: 1 }
)
```

### 11.3 Availability Update Logic

```typescript
// When booking is created (payment confirmed)
async decrementAvailability(roomTypeId: string, checkIn: Date, checkOut: Date) {
  const dates = this.getDatesInRange(checkIn, checkOut);

  const results = await this.availabilityModel.updateMany(
    {
      roomTypeId: new Types.ObjectId(roomTypeId),
      date: { $in: dates },
      availableRooms: { $gte: 1 }
    },
    {
      $inc: {
        availableRooms: -1,
        bookedRooms: 1
      }
    }
  );

  // If any date doesn't have availability, rollback
  if (results.modifiedCount !== dates.length) {
    // Rollback by incrementing back
    await this.availabilityModel.updateMany(
      { roomTypeId, date: { $in: dates.slice(0, results.modifiedCount) } },
      { $inc: { availableRooms: 1, bookedRooms: -1 } }
    );
    throw new ConflictException('Room not available for all dates');
  }
}

// When booking is cancelled
async incrementAvailability(roomTypeId: string, checkIn: Date, checkOut: Date) {
  const dates = this.getDatesInRange(checkIn, checkOut);

  await this.availabilityModel.updateMany(
    { roomTypeId: new Types.ObjectId(roomTypeId), date: { $in: dates } },
    {
      $inc: {
        availableRooms: 1,
        bookedRooms: -1
      }
    }
  );
}
```

---

## 12. CONCURRENCY STRATEGY

### 12.1 Problem Statement

```
Scenario: Last room available

User A ──────┐
             ├──► Check availability ──► Available: 1 ──► Book
User B ──────┘                                     │
                                                    │
                            Double Booking! ◄───────┘
```

### 12.2 Solution: MongoDB Transaction + Atomic Update

```typescript
@Injectable()
export class BookingService {
  async createBookingWithLock(userId: string, dto: CreateBookingDto) {
    const session = await this.connection.startSession();

    try {
      // Start transaction with snapshot isolation
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });

      // 1. Validate dates
      const dates = this.getDatesInRange(dto.checkIn, dto.checkOut);

      // 2. Check and reserve each date atomically
      for (const date of dates) {
        const result = await this.availabilityModel.findOneAndUpdate(
          {
            roomTypeId: new Types.ObjectId(dto.roomTypeId),
            date: date,
            availableRooms: { $gte: 1 }
          },
          {
            $inc: { availableRooms: -1, bookedRooms: 1 }
          },
          { session, new: true }
        );

        if (!result) {
          // Date not available - rollback previous updates
          const previousDates = dates.slice(0, dates.indexOf(date));
          await this.availabilityModel.updateMany(
            {
              roomTypeId: new Types.ObjectId(dto.roomTypeId),
              date: { $in: previousDates }
            },
            {
              $inc: { availableRooms: 1, bookedRooms: -1 }
            },
            { session }
          );

          throw new ConflictException(
            `Room not available on ${date.toISOString().split('T')[0]}`
          );
        }
      }

      // 3. Create booking
      const booking = await this.bookingModel.create(
        [{
          userId: new Types.ObjectId(userId),
          hotelId: new Types.ObjectId(dto.hotelId),
          roomTypeId: new Types.ObjectId(dto.roomTypeId),
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          guestCount: dto.guestCount,
          totalPrice: dto.totalPrice,
          status: 'PENDING_PAYMENT',
          createdAt: new Date()
        }],
        { session }
      );

      // 4. Commit transaction
      await session.commitTransaction();

      return booking[0];

    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
```

### 12.3 Why This Works

| Technique | Purpose |
|-----------|---------|
| MongoDB Transaction | Ensures all-or-nothing |
| Snapshot Isolation | Consistent reads during transaction |
| Atomic findOneAndUpdate | Only one request can decrement |
| $gte: 1 condition | Prevents negative availability |
| Rollback on failure | Restore previous state |

---

## 13. MONGODB DATA MODEL

### 13.1 users Collection

```javascript
{
  _id: ObjectId,

  // Authentication
  email: String,           // Unique, indexed
  passwordHash: String,    // bcrypt/Argon2
  refreshToken: String,    // For token rotation
  refreshTokenExpiry: Date,

  // Profile
  name: String,
  phone: String,
  avatar: String,          // URL

  // Role & Status
  role: String,            // Enum: 'USER', 'OWNER', 'ADMIN'
  ownerStatus: String,      // Enum: null, 'PENDING', 'APPROVED', 'REJECTED'
  isActive: Boolean,       // For account lock
  isEmailVerified: Boolean,

  // Owner specific
  businessName: String,
  businessLicense: String,  // URL to document

  // Audit
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  loginAttempts: Number,   // For brute force protection
  lockedUntil: Date
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1, ownerStatus: 1 })
db.users.createIndex({ createdAt: -1 })
```

### 13.2 hotels Collection

```javascript
{
  _id: ObjectId,

  // Basic Info
  name: String,
  description: String,
  address: String,
  city: String,
  district: String,
  country: String,

  // Location
  latitude: Number,
  longitude: Number,
  mapUrl: String,

  // Owner
  ownerId: ObjectId,       // Reference to users

  // Rating & Status
  status: String,          // Enum: 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'SUSPENDED'
  starRating: Number,       // 1-5
  averageRating: Number,   // Calculated from reviews
  reviewCount: Number,

  // Features
  amenities: [String],     // ['wifi', 'pool', 'parking', ...]
  checkInTime: String,      // e.g., "14:00"
  checkOutTime: String,     // e.g., "12:00"

  // Admin
  rejectionReason: String,

  // Audit
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}

// Indexes
db.hotels.createIndex({ ownerId: 1 })
db.hotels.createIndex({ status: 1, city: 1 })
db.hotels.createIndex({ city: 1, district: 1 })
db.hotels.createIndex({ averageRating: -1 })
db.hotels.createIndex({
  name: 'text',
  description: 'text',
  city: 'text',
  district: 'text'
})
```

### 13.3 hotel_images Collection

```javascript
{
  _id: ObjectId,
  hotelId: ObjectId,
  url: String,
  caption: String,
  isPrimary: Boolean,
  sortOrder: Number,
  createdAt: Date
}

// Indexes
db.hotel_images.createIndex({ hotelId: 1, isPrimary: -1 })
```

### 13.4 room_types Collection

```javascript
{
  _id: ObjectId,
  hotelId: ObjectId,
  name: String,
  description: String,
  totalRooms: Number,      // Total rooms of this type
  basePrice: Number,       // Base price per night
  maxGuests: Number,
  bedType: String,         // 'single', 'double', 'twin', 'suite'
  roomSize: Number,        // in square meters
  amenities: [String],

  // Admin
  status: String,          // 'ACTIVE', 'INACTIVE'

  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.room_types.createIndex({ hotelId: 1, status: 1 })
```

### 13.5 rooms Collection

```javascript
{
  _id: ObjectId,
  roomTypeId: ObjectId,
  roomNumber: String,       // e.g., "101", "202A"
  floor: Number,
  status: String            // 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'
}

// Indexes
db.rooms.createIndex({ roomTypeId: 1 })
db.rooms.createIndex({ roomNumber: 1 }, { unique: true })
```

### 13.6 room_availability Collection

```javascript
{
  _id: ObjectId,
  roomTypeId: ObjectId,
  date: Date,              // Normalized to midnight
  totalRooms: Number,
  bookedRooms: Number,
  availableRooms: Number,
  version: Number,         // For optimistic locking
  updatedAt: Date
}

// Indexes
db.room_availability.createIndex(
  { roomTypeId: 1, date: 1 },
  { unique: true }
)
db.room_availability.createIndex(
  { date: 1, availableRooms: 1 }
)
```

### 13.7 bookings Collection

```javascript
{
  _id: ObjectId,

  // References
  userId: ObjectId,
  hotelId: ObjectId,
  roomTypeId: ObjectId,
  roomId: ObjectId,         // Assigned when check-in

  // Dates
  checkIn: Date,
  checkOut: Date,
  nights: Number,           // Calculated

  // Guests
  guestCount: Number,
  guestName: String,
  guestEmail: String,
  guestPhone: String,
  guestSpecialRequests: String,

  // Pricing
  roomPrice: Number,       // Per night
  totalPrice: Number,
  currency: String,

  // Status
  status: String,          // Full state machine

  // Check-in/out
  checkedInAt: Date,
  checkedOutAt: Date,
  actualCheckOut: Date,

  // Cancellation
  cancelledAt: Date,
  cancelReason: String,
  refundAmount: Number,

  // Admin
  adminNotes: String,

  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.bookings.createIndex({ userId: 1, createdAt: -1 })
db.bookings.createIndex({ hotelId: 1, checkIn: 1 })
db.bookings.createIndex({ roomTypeId: 1, checkIn: 1, checkOut: 1 })
db.bookings.createIndex({ status: 1, createdAt: -1 })
db.bookings.createIndex({ userId: 1, status: 1 })
```

### 13.8 payments Collection

```javascript
{
  _id: ObjectId,
  bookingId: ObjectId,
  userId: ObjectId,

  amount: Number,
  currency: String,

  // Method
  method: String,          // 'MOCK_MOMO', 'MOCK_VNPAY', 'MOCK_CASH', 'MOMO', 'VNPAY'

  // Status
  status: String,          // 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'

  // Transaction
  transactionId: String,    // From payment provider
  gatewayResponse: Object,  // Raw response from provider

  // Refund
  refundedAt: Date,
  refundTransactionId: String,
  refundAmount: Number,

  // Audit
  createdAt: Date,
  paidAt: Date
}

// Indexes
db.payments.createIndex({ bookingId: 1 }, { unique: true })
db.payments.createIndex({ transactionId: 1 }, { unique: true })
db.payments.createIndex({ userId: 1, createdAt: -1 })
```

### 13.9 reviews Collection

```javascript
{
  _id: ObjectId,
  bookingId: ObjectId,
  userId: ObjectId,
  hotelId: ObjectId,

  rating: Number,           // 1-5
  title: String,
  comment: String,
  images: [String],         // URLs

  // Admin
  status: String,          // 'PENDING', 'APPROVED', 'REJECTED'
  adminNotes: String,

  // Responses
  ownerResponse: String,
  ownerRespondedAt: Date,

  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.reviews.createIndex({ hotelId: 1, createdAt: -1 })
db.reviews.createIndex({ userId: 1 })
db.reviews.createIndex({ bookingId: 1 }, { unique: true })
```

### 13.10 notifications Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,            // 'BOOKING_CONFIRMED', 'CHECK_IN_REMINDER', etc.
  title: String,
  message: String,
  data: Object,             // Additional data (bookingId, etc.)
  isRead: Boolean,
  readAt: Date,
  createdAt: Date
}

// Indexes
db.notifications.createIndex({ userId: 1, createdAt: -1 })
db.notifications.createIndex({ userId: 1, isRead: 1 })
```

---

## 14. ERD

```mermaid
erDiagram

    USERS ||--o{ BOOKINGS : "places"
    USERS ||--o{ REVIEWS : "writes"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ PAYMENTS : "makes"

    OWNERS ||--o{ HOTELS : "owns"
    OWNERS ||--o{ BOOKINGS : "receives"

    HOTELS ||--o{ HOTEL_IMAGES : "has"
    HOTELS ||--o{ ROOM_TYPES : "has"
    HOTELS ||--o{ REVIEWS : "receives"

    ROOM_TYPES ||--o{ ROOMS : "contains"
    ROOM_TYPES ||--o{ ROOM_AVAILABILITY : "tracks"

    ROOMS ||--o{ BOOKINGS : "assigned_to"

    BOOKINGS ||--o{ PAYMENTS : "has"
    BOOKINGS ||--o{ REVIEWS : "generates"

    ADMIN ||--o{ USERS : "manages"
    ADMIN ||--o{ HOTELS : "approves"

    USERS {
        ObjectId _id PK
        string email UK
        string passwordHash
        string name
        string phone
        string role
        string ownerStatus
        boolean isActive
        datetime createdAt
    }

    HOTELS {
        ObjectId _id PK
        ObjectId ownerId FK
        string name
        string description
        string address
        string city
        string district
        float latitude
        float longitude
        string status
        int starRating
        float averageRating
        string[] amenities
        datetime createdAt
    }

    HOTEL_IMAGES {
        ObjectId _id PK
        ObjectId hotelId FK
        string url
        string caption
        boolean isPrimary
    }

    ROOM_TYPES {
        ObjectId _id PK
        ObjectId hotelId FK
        string name
        string description
        int totalRooms
        double basePrice
        int maxGuests
        string bedType
        string[] amenities
        datetime createdAt
    }

    ROOMS {
        ObjectId _id PK
        ObjectId roomTypeId FK
        string roomNumber
        int floor
        string status
    }

    ROOM_AVAILABILITY {
        ObjectId _id PK
        ObjectId roomTypeId FK
        date date
        int totalRooms
        int bookedRooms
        int availableRooms
    }

    BOOKINGS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId hotelId FK
        ObjectId roomTypeId FK
        ObjectId roomId FK
        date checkIn
        date checkOut
        int guestCount
        string guestName
        string guestEmail
        string guestPhone
        double roomPrice
        double totalPrice
        string status
        datetime checkedInAt
        datetime checkedOutAt
        datetime createdAt
    }

    PAYMENTS {
        ObjectId _id PK
        ObjectId bookingId FK
        ObjectId userId FK
        double amount
        string method
        string status
        string transactionId
        datetime paidAt
    }

    REVIEWS {
        ObjectId _id PK
        ObjectId bookingId FK
        ObjectId userId FK
        ObjectId hotelId FK
        int rating
        string comment
        string[] images
        string status
        datetime createdAt
    }

    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId userId FK
        string type
        string title
        string message
        boolean isRead
        datetime createdAt
    }
```

---

## 15. MONGODB INDEX STRATEGY

### 15.1 Query Patterns & Indexes

| Collection | Query Pattern | Index | Type |
|------------|--------------|-------|------|
| users | Find by email | `{ email: 1 }` | Unique |
| users | Find pending owners | `{ role: 1, ownerStatus: 1 }` | Compound |
| users | Find by date | `{ createdAt: -1 }` | Single |
| hotels | Find by owner | `{ ownerId: 1 }` | Single |
| hotels | Find by status & city | `{ status: 1, city: 1 }` | Compound |
| hotels | Text search | `{ name: 'text', description: 'text' }` | Text |
| hotels | Sort by rating | `{ averageRating: -1 }` | Single |
| room_types | Find by hotel | `{ hotelId: 1 }` | Single |
| room_availability | Check availability | `{ roomTypeId: 1, date: 1 }` | Compound (unique) |
| room_availability | Find available | `{ date: 1, availableRooms: 1 }` | Compound |
| bookings | User's bookings | `{ userId: 1, createdAt: -1 }` | Compound |
| bookings | Hotel's bookings | `{ hotelId: 1, checkIn: 1 }` | Compound |
| bookings | Find by status | `{ status: 1, createdAt: -1 }` | Compound |
| payments | Find by booking | `{ bookingId: 1 }` | Unique |
| payments | Find by transaction | `{ transactionId: 1 }` | Unique |
| reviews | Hotel's reviews | `{ hotelId: 1, createdAt: -1 }` | Compound |

### 15.2 Index Creation Script

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, ownerStatus: 1 });
db.users.createIndex({ createdAt: -1 });

// Hotels
db.hotels.createIndex({ ownerId: 1 });
db.hotels.createIndex({ status: 1, city: 1 });
db.hotels.createIndex({
  name: 'text',
  description: 'text',
  city: 'text',
  district: 'text'
}, {
  weights: {
    name: 10,
    city: 5,
    district: 3,
    description: 1
  }
});
db.hotels.createIndex({ averageRating: -1 });

// Hotel Images
db.hotel_images.createIndex({ hotelId: 1, isPrimary: -1 });

// Room Types
db.room_types.createIndex({ hotelId: 1, status: 1 });

// Rooms
db.rooms.createIndex({ roomTypeId: 1 });
db.rooms.createIndex({ roomNumber: 1 }, { unique: true });

// Room Availability
db.room_availability.createIndex(
  { roomTypeId: 1, date: 1 },
  { unique: true }
);
db.room_availability.createIndex({ date: 1, availableRooms: 1 });

// Bookings
db.bookings.createIndex({ userId: 1, createdAt: -1 });
db.bookings.createIndex({ hotelId: 1, checkIn: 1 });
db.bookings.createIndex({ roomTypeId: 1, checkIn: 1, checkOut: 1 });
db.bookings.createIndex({ status: 1, createdAt: -1 });
db.bookings.createIndex({ userId: 1, status: 1 });

// Payments
db.payments.createIndex({ bookingId: 1 }, { unique: true });
db.payments.createIndex({ transactionId: 1 }, { unique: true });
db.payments.createIndex({ userId: 1, createdAt: -1 });

// Reviews
db.reviews.createIndex({ hotelId: 1, createdAt: -1 });
db.reviews.createIndex({ userId: 1 });
db.reviews.createIndex({ bookingId: 1 }, { unique: true });

// Notifications
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });
```

---

## 16. REST API ARCHITECTURE

### 16.1 API Structure

```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   ├── POST /logout
│   ├── POST /forgot-password
│   └── POST /reset-password
│
├── /users
│   ├── GET /me
│   ├── PUT /me
│   └── DELETE /me
│
├── /hotels
│   ├── GET /                    (public)
│   ├── GET /:id                (public)
│   ├── GET /:id/rooms
│   ├── GET /:id/availability
│   └── GET /:id/reviews
│
├── /bookings
│   ├── POST /
│   ├── GET /
│   ├── GET /:id
│   ├── POST /:id/cancel
│   ├── POST /:id/check-in
│   └── POST /:id/check-out
│
├── /payments
│   ├── POST /
│   ├── GET /:id
│   └── POST /webhook
│
├── /reviews
│   ├── POST /
│   ├── GET /hotel/:hotelId
│   └── PUT /:id/respond
│
├── /owner
│   ├── POST /apply
│   ├── GET /hotels
│   ├── POST /hotels
│   ├── PUT /hotels/:id
│   ├── POST /hotels/:id/submit
│   ├── DELETE /hotels/:id
│   ├── POST /room-types
│   ├── PUT /room-types/:id
│   ├── GET /bookings
│   └── GET /revenue
│
├── /notifications
│   ├── GET /
│   ├── PUT /:id/read
│   └── PUT /read-all
│
└── /admin
    ├── GET /statistics
    ├── GET /users
    ├── GET /owners/pending
    ├── POST /owners/:id/approve
    ├── POST /owners/:id/reject
    ├── GET /hotels/pending
    ├── POST /hotels/:id/approve
    ├── POST /hotels/:id/reject
    ├── GET /bookings
    ├── GET /payments
    └── GET /reviews
```

### 16.2 Response Format

```typescript
// Success Response
{
  success: true,
  data: { ... },
  meta?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// Error Response
{
  success: false,
  error: {
    code: string,      // e.g., 'ROOM_NOT_AVAILABLE'
    message: string,   // Human readable
    details?: any     // Additional info
  }
}
```

---

## 17. API SPECIFICATION

### 17.1 Authentication

#### POST /api/auth/register
```yaml
description: Register new user
body:
  email: string (required, email format)
  password: string (required, min 8 chars, must contain uppercase, lowercase, number)
  name: string (required, min 2 chars, max 100)
  phone: string (optional)
response:
  201:
    user: User object
    accessToken: string
    refreshToken: string
  400:
    error: Validation failed
  409:
    error: Email already exists
```

#### POST /api/auth/login
```yaml
description: Login with email and password
body:
  email: string (required)
  password: string (required)
response:
  200:
    user: User object
    accessToken: string
    refreshToken: string
  401:
    error: Invalid credentials
  423:
    error: Account locked
```

#### POST /api/auth/refresh
```yaml
description: Refresh access token
body:
  refreshToken: string (required)
response:
  200:
    accessToken: string
    refreshToken: string
  401:
    error: Invalid or expired refresh token
```

### 17.2 Hotels

#### GET /api/hotels
```yaml
description: Search hotels with filters
query:
  destination: string (city or district)
  checkIn: date (YYYY-MM-DD)
  checkOut: date (YYYY-MM-DD)
  guests: number (default: 1)
  rooms: number (default: 1)
  minPrice: number
  maxPrice: number
  minRating: number (1-5)
  amenities: string[] (comma separated)
  sortBy: string (price_low, price_high, rating, popularity)
  page: number (default: 1)
  limit: number (default: 20, max: 100)
auth: Optional
response:
  200:
    hotels: HotelSummary[]
    pagination: PaginationMeta
```

#### GET /api/hotels/:id
```yaml
description: Get hotel details
params:
  id: string (hotel ObjectId)
query:
  checkIn: date
  checkOut: date
auth: Optional
response:
  200:
    hotel: HotelDetail
    roomTypes: RoomTypeWithAvailability[]
    reviews: Review[]
    averageRating: number
    reviewCount: number
  404:
    error: Hotel not found
```

#### GET /api/hotels/:id/availability
```yaml
description: Check room availability for dates
params:
  id: string (hotel ObjectId)
query:
  checkIn: date (required)
  checkOut: date (required)
auth: Optional
response:
  200:
    roomTypes:
      - id: string
        name: string
        availableRooms: number
        pricePerNight: number
        totalPrice: number
```

### 17.3 Bookings

#### POST /api/bookings
```yaml
description: Create new booking
auth: Required (USER)
body:
  hotelId: string (required)
  roomTypeId: string (required)
  checkIn: date (required, must be future date)
  checkOut: date (required, must be after checkIn)
  guestCount: number (required, must be <= maxGuests)
  guestInfo:
    name: string (required)
    email: string (required)
    phone: string (required)
    specialRequests: string (optional)
response:
  201:
    booking: Booking object
    paymentRequired: true
  400:
    error: Invalid dates
  409:
    error: Room not available
```

#### GET /api/bookings
```yaml
description: Get user's bookings
auth: Required (USER)
query:
  status: BookingStatus (optional)
  page: number (default: 1)
  limit: number (default: 20)
response:
  200:
    bookings: Booking[]
    pagination: PaginationMeta
```

#### GET /api/bookings/:id
```yaml
description: Get booking details
auth: Required (owner of booking or ADMIN)
response:
  200:
    booking: BookingDetail
    hotel: HotelSummary
    payment: Payment
  403:
    error: Not authorized
  404:
    error: Booking not found
```

#### POST /api/bookings/:id/cancel
```yaml
description: Cancel booking
auth: Required (owner of booking)
body:
  reason: string (optional)
response:
  200:
    booking: Booking object
    refundRequired: boolean
    refundAmount: number
  400:
    error: Cannot cancel at this time
```

#### POST /api/bookings/:id/check-in
```yaml
description: Check in guest
auth: Required (HOTEL_OWNER - owner of hotel)
body:
  actualGuestName: string (optional)
response:
  200:
    booking: Booking object
  400:
    error: Cannot check in at this time
  403:
    error: Not hotel owner
```

#### POST /api/bookings/:id/check-out
```yaml
description: Check out guest
auth: Required (HOTEL_OWNER - owner of hotel)
response:
  200:
    booking: Booking object
  400:
    error: Cannot check out at this time
  403:
    error: Not hotel owner
```

### 17.4 Payments

#### POST /api/payments
```yaml
description: Create payment for booking
auth: Required (USER - owner of booking)
body:
  bookingId: string (required)
  method: string (required, enum: MOCK_MOMO, MOCK_VNPAY, MOCK_CASH)
response:
  201:
    payment: Payment object
    paymentUrl: string (for MOCK_MOMO, MOCK_VNPAY)
  400:
    error: Booking already paid
  409:
    error: Booking status cannot accept payment
```

#### POST /api/payments/webhook
```yaml
description: Payment provider callback (webhook)
body:
  transactionId: string
  status: string (SUCCESS, FAILED)
  amount: number
  signature: string
response:
  200:
    received: true
  400:
    error: Invalid signature
```

### 17.5 Owner Endpoints

#### POST /api/owner/apply
```yaml
description: Apply to become hotel owner
auth: Required (USER)
body:
  businessName: string (required)
  businessLicense: string (required, URL or file)
response:
  201:
    status: PENDING
  400:
    error: Already owner or pending
```

#### POST /api/owner/hotels
```yaml
description: Create new hotel
auth: Required (HOTEL_OWNER - APPROVED)
body:
  name: string (required)
  description: string (required)
  address: string (required)
  city: string (required)
  district: string (required)
  latitude: number (required)
  longitude: number (required)
  amenities: string[] (required)
  checkInTime: string (default: "14:00")
  checkOutTime: string (default: "12:00")
response:
  201:
    hotel: Hotel object
    status: DRAFT
```

#### PUT /api/owner/hotels/:id
```yaml
description: Update hotel
auth: Required (HOTEL_OWNER - owner of hotel)
body: (same as create, all optional)
response:
  200:
    hotel: Hotel object
  403:
    error: Not your hotel
  404:
    error: Hotel not found
```

#### POST /api/owner/hotels/:id/submit
```yaml
description: Submit hotel for approval
auth: Required (HOTEL_OWNER - owner of hotel)
response:
  200:
    hotel: Hotel object
    status: PENDING_APPROVAL
  400:
    error: Hotel already submitted
```

#### GET /api/owner/bookings
```yaml
description: Get owner's bookings
auth: Required (HOTEL_OWNER)
query:
  hotelId: string (optional)
  status: BookingStatus (optional)
  page: number
  limit: number
response:
  200:
    bookings: BookingWithGuest[]
    pagination: PaginationMeta
```

#### GET /api/owner/revenue
```yaml
description: Get owner's revenue statistics
auth: Required (HOTEL_OWNER)
query:
  hotelId: string (optional)
  from: date
  to: date
response:
  200:
    totalRevenue: number
    bookingsCount: number
    averageBookingValue: number
    occupancyRate: number
    revenueByHotel: { hotelId: revenue }[]
    revenueByMonth: { month: revenue }[]
```

### 17.6 Admin Endpoints

#### GET /api/admin/statistics
```yaml
description: Get system statistics
auth: Required (ADMIN)
response:
  200:
    totalUsers: number
    totalOwners: number
    pendingOwners: number
    totalHotels: number
    pendingHotels: number
    totalBookings: number
    totalRevenue: number
    totalRefunds: number
    occupancyRate: number
    topHotels: HotelSummary[]
    recentBookings: Booking[]
    recentReviews: Review[]
```

#### POST /api/admin/owners/:id/approve
```yaml
description: Approve hotel owner
auth: Required (ADMIN)
response:
  200:
    owner: User object
    status: APPROVED
  400:
    error: Owner already approved
```

#### POST /api/admin/owners/:id/reject
```yaml
description: Reject hotel owner
auth: Required (ADMIN)
body:
  reason: string (required)
response:
  200:
    owner: User object
    status: REJECTED
    reason: string
```

#### POST /api/admin/hotels/:id/approve
```yaml
description: Approve hotel
auth: Required (ADMIN)
response:
  200:
    hotel: Hotel object
    status: PUBLISHED
```

#### POST /api/admin/hotels/:id/reject
```yaml
description: Reject hotel
auth: Required (ADMIN)
body:
  reason: string (required)
response:
  200:
    hotel: Hotel object
    status: REJECTED
    rejectionReason: string
```

---

## 18. AUTHENTICATION

### 18.1 JWT Implementation

```typescript
// JWT Payload
interface JwtPayload {
  sub: string;          // User ID
  email: string;
  role: UserRole;
  iat: number;          // Issued at
  exp: number;          // Expiration
}

// Access Token
// - Expiry: 15 minutes
// - Claims: sub, email, role

// Refresh Token
// - Expiry: 7 days
// - Stored in database
// - Single use (rotation)
```

### 18.2 Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend

    U->>FE: Login (email, password)
    FE->>API: POST /auth/login
    API->>API: Validate password
    API->>API: Generate tokens
    API->>API: Store refresh token
    API-->>FE: { accessToken, refreshToken, user }
    FE->>FE: Store tokens securely

    Note over FE,API: Subsequent requests

    FE->>API: GET /hotels (with accessToken)
    API->>API: Verify accessToken
    alt Token valid
        API-->>FE: { hotels }
    else Token expired
        FE->>API: POST /auth/refresh (with refreshToken)
        API->>API: Verify refreshToken
        API->>API: Generate new tokens
        API->>API: Rotate refresh token
        API-->>FE: { accessToken, refreshToken }
        FE->>API: Retry original request
    else Refresh token expired
        API-->>FE: 401 Unauthorized
        FE->>FE: Redirect to login
    end
```

### 18.3 Password Security

```typescript
// Hashing with bcrypt
const SALT_ROUNDS = 12;

// Validate password strength
const passwordSchema = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false  // Optional for MVP
};

// Hash password
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

---

## 19. AUTHORIZATION

### 19.1 Role-Based Access Control

```typescript
// Roles
enum Role {
  USER = 'USER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN'
}

// Permission matrix
const permissions = {
  USER: [
    'auth:*',
    'hotels:read',
    'bookings:create',
    'bookings:read:own',
    'bookings:cancel:own',
    'reviews:create:own',
    'payments:*'
  ],
  OWNER: [
    'auth:*',
    'hotels:read',
    'hotels:read:own',
    'hotels:create',
    'hotels:update:own',
    'hotels:submit:own',
    'room-types:*',
    'bookings:read:own',
    'bookings:checkin:own',
    'bookings:checkout:own',
    'reviews:respond:own'
  ],
  ADMIN: ['*']
};
```

### 19.2 Ownership Guards

```typescript
// Hotel Ownership Guard
@Injectable()
export class HotelOwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const hotelId = request.params.hotelId;

    // Admin can access all
    if (user.role === 'ADMIN') return true;

    // Check ownership
    const hotel = await this.hotelModel.findById(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');

    if (hotel.ownerId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not own this hotel');
    }

    // Attach hotel to request for later use
    request.hotel = hotel;
    return true;
  }
}

// Booking Ownership Guard
@Injectable()
export class BookingOwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const bookingId = request.params.bookingId;

    // Admin can access all
    if (user.role === 'ADMIN') return true;

    const booking = await this.bookingModel.findById(bookingId);

    // Check if user owns the booking
    if (booking.userId.toString() !== user._id.toString()) {
      // Or if user is owner of the hotel
      const hotel = await this.hotelModel.findById(booking.hotelId);
      if (hotel.ownerId.toString() !== user._id.toString()) {
        throw new ForbiddenException('You do not have access to this booking');
      }
    }

    request.booking = booking;
    return true;
  }
}
```

### 19.3 Ownership Decorator

```typescript
// Custom decorator for getting current user
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Custom decorator for getting ownership-checked entity
export const Hotel = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.hotel;
  },
);
```

---

## 20. SECURITY ARCHITECTURE

### 20.1 Security Layers

```mermaid
graph TB
    subgraph Request["🔒 Incoming Request"]
        R["JWT Token"]
        RB["Request Body"]
        RP["Request Params"]
    end

    subgraph Layer1["Layer 1: Transport"]
        HTTPS["HTTPS Only"]
        CORS["CORS Config"]
    end

    subgraph Layer2["Layer 2: Rate Limiting"]
        RL["Rate Limiter\n100 req/min per IP"]
        RL2["Rate Limiter\n10 req/min per user"]
    end

    subgraph Layer3["Layer 3: Authentication"]
        JWT["JWT Verify"]
        RT["Refresh Token Check"]
    end

    subgraph Layer4["Layer 4: Authorization"]
        RG["Roles Guard"]
        OG["Ownership Guard"]
    end

    subgraph Layer5["Layer 5: Validation"]
        VD["DTO Validation\n(class-validator)"]
        SAN["Sanitization"]
    end

    subgraph Layer6["Layer 6: Business Logic"]
        BL["Service Layer"]
        OW["Ownership Check"]
    end

    Request --> Layer1 --> Layer2 --> Layer3 --> Layer4 --> Layer5 --> Layer6
```

### 20.2 Security Measures

| Threat | Prevention | Implementation |
|--------|------------|----------------|
| Brute Force | Rate limiting + Lockout | 5 failed attempts = 15 min lock |
| SQL/NoSQL Injection | Mongoose sanitization | Never use string concatenation |
| XSS | Input sanitization | Strip HTML tags |
| IDOR | Ownership guards | Check on every request |
| Double Booking | MongoDB transactions | Atomic updates |
| Payment Fraud | Backend verification | Never trust frontend |
| Token Theft | Short expiry | 15 min access token |
| CSRF | SameSite cookies | HttpOnly + Secure |
| Sensitive Data Exposure | Encryption at rest | bcrypt + HTTPS |

### 20.3 Rate Limiting Configuration

```typescript
// Global rate limit
ThrottlerModule.forRoot({
  throttlers: [
    {
      name: 'global',
      ttl: 60000,    // 1 minute
      limit: 100,    // 100 requests per minute
    },
    {
      name: 'auth',
      ttl: 60000,
      limit: 10,     // 10 attempts per minute for auth
    },
    {
      name: 'strict',
      ttl: 60000,
      limit: 5,      // 5 requests per minute for sensitive ops
    },
  ],
});
```

---

## 21. NOTIFICATION ARCHITECTURE

### 21.1 Notification Types

```typescript
enum NotificationType {
  // User notifications
  BOOKING_CREATED = 'BOOKING_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  CHECK_IN_REMINDER = 'CHECK_IN_REMINDER',
  CHECK_OUT_REMINDER = 'CHECK_OUT_REMINDER',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  NEW_REVIEW_REPLY = 'NEW_REVIEW_REPLY',

  // Owner notifications
  OWNER_APPROVED = 'OWNER_APPROVED',
  OWNER_REJECTED = 'OWNER_REJECTED',
  HOTEL_APPROVED = 'HOTEL_APPROVED',
  HOTEL_REJECTED = 'HOTEL_REJECTED',
  NEW_BOOKING = 'NEW_BOOKING',
  GUEST_CHECK_IN = 'GUEST_CHECK_IN',
  GUEST_CHECK_OUT = 'GUEST_CHECK_OUT',
  NEW_REVIEW = 'NEW_REVIEW',

  // Admin notifications
  NEW_OWNER_APPLICATION = 'NEW_OWNER_APPLICATION',
  NEW_HOTEL_SUBMISSION = 'NEW_HOTEL_SUBMISSION',
  PAYMENT_FLAGGED = 'PAYMENT_FLAGGED',
  COMPLAINT_RECEIVED = 'COMPLAINT_RECEIVED',
}
```

### 21.2 Notification Service

```typescript
@Injectable()
export class NotificationService {
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ) {
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date(),
    });

    // In production, send push notification here
    // await this.pushService.send(userId, { title, body: message });

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.notificationModel.updateOne(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { isRead: true, readAt: new Date() }
    );
  }
}
```

---

## 22. IMAGE STORAGE ARCHITECTURE

### 22.1 Storage Options Analysis

| Service | Free Tier | Credit Card | Storage | Bandwidth | Recommended |
|---------|-----------|-------------|---------|-----------|-------------|
| Cloudinary | ✅ 25 credits | ❌ | 2GB | 200GB/mo | ✅ |
| Supabase Storage | ✅ 1GB | ❌ | 1GB | 4GB/mo | ✅ |
| ImageKit | ✅ 20GB BW | ❌ | - | 20GB/mo | ✅ |
| Local/Docker | ✅ | ❌ | Host limited | - | ✅ Dev |
| Firebase Storage | ⚠️ Requires Blaze | ❌ | 5GB | 1GB/day | ❌ |

### 22.2 Storage Service Interface

```typescript
interface IStorageService {
  upload(file: Express.Multer.File, folder: string): Promise<string>;
  uploadMultiple(files: Express.Multer.File[], folder: string): Promise<string[]>;
  delete(url: string): Promise<void>;
}

// Implementations
class CloudinaryStorageService implements IStorageService { }
class LocalStorageService implements IStorageService { }

// Factory
class StorageServiceFactory {
  static create(): IStorageService {
    if (process.env.STORAGE_TYPE === 'cloudinary') {
      return new CloudinaryStorageService();
    }
    return new LocalStorageService();
  }
}
```

### 22.3 Image Upload Validation

```typescript
// File validation
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Only image files are allowed (jpg, png, webp)'));
    return;
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    cb(new Error('File size must be less than 5MB'));
    return;
  }

  cb(null, true);
};

// Usage in controller
@UseInterceptors(
  FileInterceptor('images', {
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 10, // Max 10 files per upload
    },
  }),
)
async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
  // ...
}
```

---

## 23. SWIFTUI ARCHITECTURE

### 23.1 Project Structure

```
DuLich/
├── App/
│   ├── DuLichApp.swift
│   ├── AppDelegate.swift
│   └── Environment/
│       └── AppEnvironment.swift
│
├── Core/
│   ├── Network/
│   │   ├── APIClient.swift
│   │   ├── APIEndpoint.swift
│   │   ├── APIError.swift
│   │   ├── APIResponse.swift
│   │   └── NetworkMonitor.swift
│   │
│   ├── Auth/
│   │   ├── AuthService.swift
│   │   ├── AuthState.swift
│   │   ├── TokenManager.swift
│   │   └── KeychainHelper.swift
│   │
│   ├── Storage/
│   │   ├── TokenStorage.swift
│   │   └── UserDefaultsManager.swift
│   │
│   └── Services/
│       ├── HotelService.swift
│       ├── BookingService.swift
│       ├── PaymentService.swift
│       ├── ReviewService.swift
│       └── NotificationService.swift
│
├── Features/
│   ├── Auth/
│   │   ├── Views/
│   │   │   ├── LoginView.swift
│   │   │   ├── RegisterView.swift
│   │   │   └── ForgotPasswordView.swift
│   │   └── ViewModels/
│   │       └── AuthViewModel.swift
│   │
│   ├── Home/
│   │   ├── Views/
│   │   │   ├── HomeView.swift
│   │   │   └── SearchBarView.swift
│   │   └── ViewModels/
│   │       └── HomeViewModel.swift
│   │
│   ├── Search/
│   │   ├── Views/
│   │   │   ├── SearchView.swift
│   │   │   ├── FilterView.swift
│   │   │   └── SearchResultsView.swift
│   │   └── ViewModels/
│   │       └── SearchViewModel.swift
│   │
│   ├── Hotel/
│   │   ├── Views/
│   │   │   ├── HotelDetailView.swift
│   │   │   ├── HotelImageCarouselView.swift
│   │   │   ├── RoomSelectionView.swift
│   │   │   └── MapView.swift
│   │   └── ViewModels/
│   │       └── HotelDetailViewModel.swift
│   │
│   ├── Booking/
│   │   ├── Views/
│   │   │   ├── BookingFormView.swift
│   │   │   ├── BookingSummaryView.swift
│   │   │   └── BookingConfirmationView.swift
│   │   └── ViewModels/
│   │       └── BookingViewModel.swift
│   │
│   ├── Trips/
│   │   ├── Views/
│   │   │   ├── MyTripsView.swift
│   │   │   └── TripDetailView.swift
│   │   └── ViewModels/
│   │       └── TripsViewModel.swift
│   │
│   ├── Payment/
│   │   ├── Views/
│   │   │   ├── PaymentView.swift
│   │   │   ├── MoMoPaymentView.swift
│   │   │   └── PaymentSuccessView.swift
│   │   └── ViewModels/
│   │       └── PaymentViewModel.swift
│   │
│   ├── Owner/
│   │   ├── Views/
│   │   │   ├── OwnerDashboardView.swift
│   │   │   ├── HotelManagementView.swift
│   │   │   ├── RoomManagementView.swift
│   │   │   └── RevenueView.swift
│   │   └── ViewModels/
│   │       └── OwnerViewModel.swift
│   │
│   ├── Admin/
│   │   ├── Views/
│   │   │   ├── AdminDashboardView.swift
│   │   │   ├── ApprovalListView.swift
│   │   │   └── UserManagementView.swift
│   │   └── ViewModels/
│   │       └── AdminViewModel.swift
│   │
│   └── Profile/
│       ├── Views/
│       │   ├── ProfileView.swift
│       │   └── SettingsView.swift
│       └── ViewModels/
│           └── ProfileViewModel.swift
│
├── Shared/
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Hotel.swift
│   │   ├── RoomType.swift
│   │   ├── Booking.swift
│   │   ├── Payment.swift
│   │   ├── Review.swift
│   │   └── APIResponse.swift
│   │
│   ├── Components/
│   │   ├── LoadingView.swift
│   │   ├── ErrorView.swift
│   │   ├── EmptyStateView.swift
│   │   ├── PrimaryButton.swift
│   │   ├── RatingView.swift
│   │   └── PriceView.swift
│   │
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   ├── String+Extensions.swift
│   │   └── Color+Extensions.swift
│   │
│   └── Utilities/
│       ├── Constants.swift
│       └── Formatters.swift
│
└── Resources/
    ├── Assets.xcassets
    └── Localizable.strings
```

### 23.2 Network Layer

```swift
// APIClient.swift
class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
        self.encoder.dateEncodingStrategy = .iso8601
    }

    func request<T: Decodable>(
        _ endpoint: APIEndpoint,
        responseType: T.Type
    ) async throws -> T {
        let request = try buildRequest(endpoint)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw try decoder.decode(APIErrorResponse.self, from: data)
        }

        return try decoder.decode(T.self, from: data)
    }

    private func buildRequest(_ endpoint: APIEndpoint) throws -> URLRequest {
        guard let url = URL(string: APIEndpoint.baseURL + endpoint.path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue

        // Add auth header
        if let token = TokenManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add content type
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add body
        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
        }

        return request
    }
}
```

### 23.3 API Endpoints

```swift
// APIEndpoint.swift
enum APIEndpoint {
    case register(email: String, password: String, name: String)
    case login(email: String, password: String)
    case refresh(token: String)
    case hotels(query: HotelSearchQuery)
    case hotelDetail(id: String)
    case hotelAvailability(id: String, checkIn: Date, checkOut: Date)
    case createBooking(dto: CreateBookingDTO)
    case myBookings(status: BookingStatus?)
    case bookingDetail(id: String)
    case cancelBooking(id: String, reason: String?)
    case checkIn(bookingId: String)
    case checkOut(bookingId: String)
    case createPayment(bookingId: String, method: PaymentMethod)
    case createReview(bookingId: String, rating: Int, comment: String)

    var baseURL: String {
        #if DEBUG
        return "http://localhost:3000/api"
        #else
        return "https://api.dulich.app/api"
        #endif
    }

    var path: String {
        switch self {
        case .register: return "/auth/register"
        case .login: return "/auth/login"
        case .refresh: return "/auth/refresh"
        case .hotels: return "/hotels"
        case .hotelDetail(let id): return "/hotels/\(id)"
        case .hotelAvailability(let id, _, _): return "/hotels/\(id)/availability"
        case .createBooking: return "/bookings"
        case .myBookings: return "/bookings"
        case .bookingDetail(let id): return "/bookings/\(id)"
        case .cancelBooking(let id, _): return "/bookings/\(id)/cancel"
        case .checkIn(let bookingId): return "/bookings/\(bookingId)/check-in"
        case .checkOut(let bookingId): return "/bookings/\(bookingId)/check-out"
        case .createPayment: return "/payments"
        case .createReview: return "/reviews"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .register, .login, .refresh, .createBooking, .cancelBooking,
             .checkIn, .checkOut, .createPayment, .createReview:
            return .POST
        default:
            return .GET
        }
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .hotels(let query):
            var items = [URLQueryItem]()
            if let destination = query.destination {
                items.append(URLQueryItem(name: "destination", value: destination))
            }
            // ... other query params
            return items
        case .myBookings(let status):
            if let status = status {
                return [URLQueryItem(name: "status", value: status.rawValue)]
            }
            return nil
        default:
            return nil
        }
    }
}
```

---

## 24. NESTJS ARCHITECTURE

### 24.1 Module Overview

```mermaid
graph TB
    subgraph Core["Core Modules"]
        Auth
        Users
        Config
    end

    subgraph Business["Business Modules"]
        Hotels
        RoomTypes
        Bookings
        Payments
        Reviews
    end

    subgraph Support["Support Modules"]
        Notifications
        Owners
        Admin
    end

    Core --> Business
    Business --> Support
```

### 24.2 Module Descriptions

| Module | Responsibility | Public API |
|--------|---------------|------------|
| Auth | Authentication, JWT, Refresh tokens | /auth/* |
| Users | User management, profiles | /users/* |
| Hotels | Hotel CRUD, search, listing | /hotels/* |
| RoomTypes | Room type management | /owner/room-types/* |
| Bookings | Booking lifecycle, state machine | /bookings/* |
| Payments | Payment processing, webhooks | /payments/* |
| Reviews | Review management, responses | /reviews/* |
| Notifications | In-app notifications | /notifications/* |
| Owners | Owner dashboard, revenue | /owner/* |
| Admin | Admin dashboard, approvals | /admin/* |

---

## 25. DEPLOYMENT ARCHITECTURE

### 25.1 Development Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/dulich?authSource=admin
      - JWT_SECRET=your-secret-key
      - JWT_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

### 25.2 Production Deployment ($0)

```mermaid
graph TB
    subgraph GitHub["GitHub"]
        BE["Backend Repo"]
        FE["iOS Repo"]
    end

    subgraph Backend["Backend Deployment"]
        R["Railway/Render"]
        N["NestJS App"]
    end

    subgraph Database["Database"]
        MA["MongoDB Atlas M0"]
    end

    subgraph Storage["Storage"]
        CL["Cloudinary"]
    end

    subgraph Mobile["Mobile"]
        X["Xcode"]
        S["Simulator"]
        A["App Store"]
    end

    BE -->|Auto Deploy| R
    R --> N
    N --> MA
    N --> CL
```

### 25.3 Free Tier Services

| Service | Type | Free Tier | URL |
|---------|------|-----------|-----|
| Railway | Backend Hosting | 500 hours/month | railway.app |
| Render | Backend Hosting | 750 hours/month | render.com |
| MongoDB Atlas | Database | M0 512MB | mongodb.com/atlas |
| Cloudinary | Image Storage | 25 credits/month | cloudinary.com |
| GitHub | Code Repository | Unlimited | github.com |

---

## 26. FREE INFRASTRUCTURE

### 26.1 Recommended Stack ($0)

| Component | Technology | Free Tier | Notes |
|-----------|------------|-----------|-------|
| Backend | NestJS | ✅ Local/Docker | Free |
| Database | MongoDB Atlas M0 | ✅ 512MB | No credit card |
| Image Storage | Cloudinary | ✅ 25 credits | No credit card |
| Email | In-app Notification | ✅ Free | Mock for MVP |
| Map | MapKit | ✅ Native iOS | No API key needed |
| Payment | Mock Payment | ✅ Free | Simulate payment |
| Auth | JWT + bcrypt | ✅ Free | Self-hosted |
| Hosting | Railway | ✅ 500hrs/month | Auto-deploy |
| Git | GitHub | ✅ Unlimited | Private repos |

### 26.2 Services NOT Recommended

| Service | Reason |
|---------|--------|
| Firebase Storage | Requires Blaze plan for proper use |
| Firebase Auth | Works but couples to Firebase |
| Google Maps API | Billing required, even for free tier |
| AWS | Complex, easy to incur charges |
| Google Cloud | Easy to accidentally use paid services |
| Azure | Complex, credit card required |

---

## 27. COST ANALYSIS

### 27.1 MVP Cost Table

| Component | Technology | Free | Credit Card | Billing Risk | Recommended |
|-----------|------------|------|-------------|--------------|-------------|
| Backend | NestJS | ✅ | ❌ | ❌ | ✅ |
| Database | MongoDB Atlas | ✅ | ❌ | ❌ | ✅ |
| Image Storage | Cloudinary | ✅ | ❌ | ❌ | ✅ |
| Web Hosting | Railway | ✅ | ❌ | ❌ | ✅ |
| Authentication | JWT | ✅ | ❌ | ❌ | ✅ |
| Email | In-app | ✅ | ❌ | ❌ | ✅ |
| Map | MapKit | ✅ | ❌ | ❌ | ✅ |
| Payment | Mock | ✅ | ❌ | ❌ | ✅ |
| Notification | In-app | ✅ | ❌ | ❌ | ✅ |
| **Total** | | **$0/month** | | | |

### 27.2 Future Scaling Costs (Optional)

| Component | Technology | Est. Cost |
|-----------|------------|-----------|
| Backend | Railway Pro | $5-20/month |
| Database | MongoDB M2 | $29/month |
| Image Storage | Cloudinary Pro | $50/month |
| Email | Resend | $20/month |
| Push Notification | FCM | $0-25/month |
| **Total Scale** | | **$50-100/month** |

---

## 28. TESTING STRATEGY

### 28.1 Backend Testing

```typescript
// Test pyramid
/*
        ┌───────────────┐
        │     E2E       │  ← 10%
        │   (10 tests) │
        ├───────────────┤
        │  Integration  │  ← 30%
        │   (50 tests)  │
        ├───────────────┤
        │     Unit      │  ← 60%
        │  (100 tests)  │
        └───────────────┘
*/

describe('BookingService', () => {
  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      // Test booking creation
    });

    it('should throw error when room not available', async () => {
      // Test availability check
    });

    it('should handle concurrent booking correctly', async () => {
      // Test race condition
    });
  });

  describe('cancelBooking', () => {
    it('should cancel pending booking', async () => {
      // Test cancellation
    });

    it('should calculate refund correctly', async () => {
      // Test refund calculation
    });
  });
});
```

### 28.2 Critical Test Cases

| Test | Scenario | Expected Result |
|------|----------|----------------|
| Double Booking | 2 users book last room simultaneously | Only 1 succeeds |
| Payment Duplicate | 2 payment webhooks for same transaction | Only 1 processed |
| Unauthorized Access | User A tries to access User B's booking | 403 Forbidden |
| Owner Access | Owner A tries to access Owner B's hotel | 403 Forbidden |
| Invalid Review | User tries to review without completed booking | 400 Bad Request |
| Expired Booking | Create booking with past check-in date | 400 Bad Request |
| Cancellation Policy | Cancel 2 days before check-in | 50% refund |
| Concurrent Cancel | 2 users try to cancel same booking | Only 1 succeeds |

### 28.3 Mobile Testing

| Test | Description |
|------|-------------|
| Login Flow | Test register, login, logout |
| Search | Test search with filters |
| Booking Flow | End-to-end booking |
| Payment | Mock payment success/failure |
| My Trips | View and manage bookings |
| Review | Write and edit review |

---

## 29. DEVELOPMENT ROADMAP

### 29.1 Phase Breakdown

```mermaid
gantt
    title DuLich Development Roadmap
    dateFormat  YYYY-MM-DD

    section Phase 1: Project Setup
    NestJS Project        :2026-09-05, 2d
    MongoDB Setup         :2026-09-07, 1d
    Docker Compose        :2026-09-08, 1d
    Code Structure        :2026-09-09, 1d

    section Phase 2: Authentication
    User Schema           :2026-09-10, 1d
    Auth Controller       :2026-09-11, 2d
    JWT Implementation    :2026-09-13, 2d
    Refresh Token        :2026-09-15, 1d

    section Phase 3: Core User Features
    Hotels CRUD           :2026-09-16, 2d
    Hotel Search          :2026-09-18, 2d
    Hotel Detail          :2026-09-20, 1d

    section Phase 4: Owner Flow
    Owner Application     :2026-09-21, 2d
    Owner Dashboard      :2026-09-23, 2d
    Hotel Management     :2026-09-25, 2d

    section Phase 5: Room Management
    Room Types CRUD       :2026-09-27, 2d
    Availability System   :2026-09-29, 3d
    Concurrency Handling  :2026-10-02, 2d

    section Phase 6: Booking
    Booking Creation      :2026-10-04, 2d
    State Machine        :2026-10-06, 2d
    Cancel/Check-in/out  :2026-10-08, 2d

    section Phase 7: Payment
    Payment Module       :2026-10-10, 2d
    Mock Payment         :2026-10-12, 2d
    Webhook Handler      :2026-10-14, 1d

    section Phase 8: Reviews & Notifications
    Review System        :2026-10-15, 2d
    Notification Module  :2026-10-17, 1d

    section Phase 9: Admin
    Admin Dashboard      :2026-10-18, 2d
    Approval Workflow    :2026-10-20, 2d

    section Phase 10: SwiftUI Migration
    Network Layer        :2026-10-22, 2d
    Auth Screens         :2026-10-24, 2d
    Home & Search        :2026-10-26, 3d
    Hotel Detail         :2026-10-29, 2d
    Booking Flow         :2026-10-31, 3d
    Owner & Admin        :2026-11-03, 3d

    section Phase 11: Testing & Deployment
    Integration Test     :2026-11-06, 3d
    Bug Fixes            :2026-11-09, 2d
    Documentation        :2026-11-11, 1d
    Deployment           :2026-11-12, 1d
```

### 29.2 Phase Details

#### Phase 1: Project Setup
**Mục tiêu:** Thiết lập môi trường phát triển

**Tasks:**
- [ ] Tạo NestJS project với TypeScript
- [ ] Setup MongoDB với Docker
- [ ] Tạo docker-compose.yml
- [ ] Thiết lập folder structure
- [ ] Cài đặt dependencies cơ bản

**Acceptance Criteria:**
- Backend chạy được trên localhost:3000
- Kết nối MongoDB thành công
- Có thể chạy với docker-compose up

#### Phase 2: Authentication
**Mục tiêu:** Hệ thống đăng nhập/đăng ký

**Tasks:**
- [ ] User schema với Mongoose
- [ ] Register endpoint
- [ ] Login endpoint
- [ ] JWT access token
- [ ] Refresh token rotation
- [ ] Password hashing với bcrypt

**API:**
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

#### Phase 3: Core User Features
**Mục tiêu:** Người dùng có thể xem và tìm kiếm khách sạn

**Tasks:**
- [ ] Hotel schema
- [ ] Hotel CRUD operations
- [ ] Hotel search với filters
- [ ] Hotel detail endpoint
- [ ] Geolocation support

**API:**
- GET /hotels
- GET /hotels/:id
- GET /hotels/:id/availability

#### Phase 4: Owner Flow
**Mục tiêu:** Hotel Owner có thể quản lý khách sạn

**Tasks:**
- [ ] Owner application flow
- [ ] Admin approval/rejection
- [ ] Owner dashboard
- [ ] Hotel management (CRUD)
- [ ] Image upload

**API:**
- POST /owner/apply
- POST /owner/hotels
- PUT /owner/hotels/:id

#### Phase 5: Room Management
**Mục tiêu:** Quản lý loại phòng và availability

**Tasks:**
- [ ] Room type schema
- [ ] Room types CRUD
- [ ] Availability tracking
- [ ] Concurrency handling
- [ ] Atomic updates

**API:**
- POST /owner/room-types
- PUT /owner/room-types/:id
- GET /hotels/:id/availability

#### Phase 6: Booking
**Mục tiêu:** Người dùng có thể đặt phòng

**Tasks:**
- [ ] Booking schema
- [ ] Booking state machine
- [ ] Create booking với availability check
- [ ] Cancel booking
- [ ] Check-in/Check-out
- [ ] Refund logic

**API:**
- POST /bookings
- GET /bookings
- GET /bookings/:id
- POST /bookings/:id/cancel
- POST /bookings/:id/check-in
- POST /bookings/:id/check-out

#### Phase 7: Payment
**Mục tiêu:** Xử lý thanh toán (mock)

**Tasks:**
- [ ] Payment schema
- [ ] Mock payment provider
- [ ] Payment adapter pattern
- [ ] Webhook handler
- [ ] Payment verification

**API:**
- POST /payments
- GET /payments/:id
- POST /payments/webhook

#### Phase 8: Reviews & Notifications
**Mục tiêu:** Đánh giá và thông báo

**Tasks:**
- [ ] Review schema
- [ ] Create review (after completion)
- [ ] Get hotel reviews
- [ ] Notification schema
- [ ] In-app notifications

**API:**
- POST /reviews
- GET /hotels/:id/reviews
- GET /notifications

#### Phase 9: Admin
**Mục tiêu:** Dashboard quản trị

**Tasks:**
- [ ] Admin statistics
- [ ] Owner approval
- [ ] Hotel approval
- [ ] User management
- [ ] Booking management

**API:**
- GET /admin/statistics
- POST /admin/owners/:id/approve
- POST /admin/hotels/:id/approve

#### Phase 10: SwiftUI Migration
**Mục tiêu:** Di chuyển từ Firebase sang NestJS API

**Tasks:**
- [ ] Network layer (APIClient)
- [ ] Auth screens
- [ ] Home & Search
- [ ] Hotel detail & booking
- [ ] Owner & Admin screens

#### Phase 11: Testing & Deployment
**Mục tiêu:** Hoàn thiện và triển khai

**Tasks:**
- [ ] Integration tests
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deploy to Railway

---

## APPENDIX

### A. Environment Variables

```env
# Backend
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/dulich?authSource=admin

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend
API_BASE_URL=http://localhost:3000/api
```

### B. Git Hooks

```bash
# pre-commit hook for linting
#!/bin/bash
npm run lint
npm run test
```

### C. API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 423 | Locked |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

**Document End**

*Last updated: 02/09/2026*
*Author: Nguyễn Duy Hiệu*
