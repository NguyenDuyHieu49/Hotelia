# DuLich - Hotel Booking Platform

<div align="center">

![Swift](https://img.shields.io/badge/Swift-5.9-orange?style=flat-square&logo=swift)
![Node.js](https://img.shields.io/badge/Node.js-20-green?style=flat-square&logo=nodedotjs)
![NestJS](https://img.shields.io/badge/NestJS-10-red?style=flat-square&logo=nestjs)
![MongoDB](https://img.shields.io/badge/MongoDB-6-green?style=flat-square&logo=mongodb)
![iOS](https://img.shields.io/badge/iOS-17-blue?style=flat-square&logo=apple)

**A full-stack hotel booking platform built with SwiftUI, NestJS, and MongoDB**

*Book hotels seamlessly with a modern, scalable architecture*

[Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Features

### For Users
- 🔐 **Secure Authentication** - JWT-based auth with refresh token rotation
- 🔍 **Smart Search** - Filter by location, date, price, amenities, rating
- 🏨 **Hotel Discovery** - Browse hotels with images, amenities, and reviews
- 📅 **Easy Booking** - Intuitive booking flow with real-time availability
- 💳 **Multiple Payments** - Mock MoMo, VNPay, Bank Transfer, Cash on Delivery
- 📱 **Real-time Updates** - Booking status tracking and notifications
- ⭐ **Reviews** - Share and read authentic guest reviews

### For Hotel Owners
- 📊 **Owner Dashboard** - Revenue analytics and booking management
- 🏢 **Hotel Management** - Create, edit, and manage hotel listings
- 🛏️ **Room Management** - Configure room types, pricing, and availability
- ✅ **Approval Workflow** - Admin-reviewed hotel submissions

### For Administrators
- 📈 **Analytics Dashboard** - System-wide statistics and metrics
- 👥 **User Management** - Manage users and hotel owners
- ✔️ **Content Moderation** - Approve/reject hotels and reviews
- 🔒 **Access Control** - Role-based permissions (USER, OWNER, ADMIN)

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DuLich Platform                           │
└─────────────────────────────────────────────────────────────────────┘

     ┌─────────────┐                    ┌─────────────────────┐
     │   iOS App   │                    │   Admin Dashboard   │
     │  (SwiftUI)  │                    │     (Web App)       │
     └──────┬──────┘                    └──────────┬──────────┘
            │                                        │
            │                                        │
            ▼                                        ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                    REST API (NestJS)                        │
     │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
     │  │   Auth   │  │  Hotels  │  │ Bookings │  │ Payments │     │
     │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
     │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
     │  │  Users   │  │ Reviews  │  │  Owners  │  │  Admin   │     │
     │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
     └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                      MongoDB                                │
     │  users | hotels | bookings | payments | reviews | ...       │
     └─────────────────────────────────────────────────────────────┘
```

### Booking State Machine

```
                    ┌─────────────────┐
                    │ PENDING_PAYMENT │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌─────────┐   ┌─────────┐   ┌──────────┐
         │  PAID   │   │CANCELLED│   │  EXPIRED │
         └────┬────┘   └─────────┘   └──────────┘
              │
              ▼
         ┌───────────┐
         │ CONFIRMED │
         └─────┬─────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌───────────┐      ┌─────────────────┐
│ CHECKED_IN│      │CANCEL_REQUESTED │
└─────┬─────┘      └────────┬────────┘
      │                      │
      ▼                      ▼
┌───────────┐         ┌──────────┐
│CHECKED_OUT│         │ REFUNDED │
└─────┬─────┘         └──────────┘
      │
      ▼
┌───────────┐
│ COMPLETED │◄────────────────┐
└───────────┘                 │
      │                       │
      └─────► Review ◄─────────┘
```

### Concurrency Handling

```
┌─────────────────────────────────────────────────────────────┐
│              Double Booking Prevention                      │
└─────────────────────────────────────────────────────────────┘

  User A ───────┐
                 ├──► Check Availability ──► Room Available
  User B ───────┘                                        │
                                                         │
                    ⚠️ Only ONE succeeds ────────────────┘
                                                        │
                    ┌─────────────────────────────────┐
                    │   MongoDB Transaction +         │
                    │   Atomic findOneAndUpdate       │
                    │   with $gte: 1 condition        │
                    └─────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Mobile (iOS)

| Technology | Version | Purpose |
|------------|---------|---------|
| Swift | 5.9 | Programming language |
| SwiftUI | iOS 17+ | UI Framework |
| Xcode | 15+ | IDE |
| MapKit | Native | Maps integration |
| Combine | Built-in | Reactive programming |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| NestJS | 10 | Framework |
| TypeScript | 5.3 | Language |
| MongoDB | 6 | Database |
| Mongoose | 8 | ODM |

### Infrastructure

| Technology | Purpose | Tier |
|------------|---------|------|
| MongoDB Atlas | Database | Free M0 |
| Railway | Backend hosting | Free tier |
| Cloudinary | Image storage | Free tier |
| Docker | Containerization | Local dev |

---

## 🚀 Getting Started

### Prerequisites

- **macOS** with Xcode 15+
- **Node.js** 20 LTS
- **Docker** & Docker Compose
- **MongoDB** (local or Atlas)

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/NguyenDuyHieu49/Hotelia.git
cd Hotelia
```

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start with Docker
docker-compose up -d

# Or run locally
npm run start:dev
```

#### 3. Setup iOS App

```bash
cd DuLich
open DuLich.xcodeproj
```

Build and run in Xcode Simulator.

### Environment Variables

```env
# Backend (.env)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://admin:password@localhost:27017/dulich
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 📁 Project Structure

### Backend (`/backend`)

```
backend/
├── src/
│   ├── auth/                    # Authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   │
│   ├── users/                  # User management
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── schemas/
│   │   └── dto/
│   │
│   ├── hotels/                 # Hotel management
│   │   ├── hotels.controller.ts
│   │   ├── hotels.service.ts
│   │   └── schemas/
│   │
│   ├── bookings/               # Booking system
│   │   ├── bookings.controller.ts
│   │   ├── bookings.service.ts
│   │   ├── schemas/
│   │   └── state-machine/
│   │
│   ├── payments/               # Payment processing
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── providers/
│   │
│   ├── reviews/                # Review system
│   ├── notifications/           # In-app notifications
│   ├── admin/                  # Admin endpoints
│   ├── owners/                 # Owner dashboard
│   │
│   └── common/                 # Shared utilities
│       ├── decorators/
│       ├── guards/
│       ├── filters/
│       ├── interceptors/
│       └── middleware/
│
├── test/                       # E2E tests
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### iOS App (`/DuLich`)

```
DuLich/
├── App/
│   ├── DuLichApp.swift        # App entry point
│   └── AppDelegate.swift
│
├── Core/
│   ├── Auth/                   # Authentication
│   ├── Explore/               # Home & Search
│   ├── Hotel/                 # Hotel detail
│   ├── Booking/               # Booking flow
│   ├── Payment/               # Payment
│   ├── Profile/               # User profile
│   ├── Admin/                 # Admin features
│   └── Settings/              # Settings
│
├── Shared/
│   ├── Models/                # Data models
│   ├── Components/           # Reusable UI
│   └── Extensions/             # Swift extensions
│
└── Resources/
    ├── Assets.xcassets
    └── Localizable.strings
```

---

## 📚 Documentation

### API Documentation

API documentation available via Swagger when running in development:

```
http://localhost:3000/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| GET | `/api/v1/hotels` | Search hotels |
| GET | `/api/v1/hotels/:id` | Hotel details |
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings` | User's bookings |
| POST | `/api/v1/payments` | Process payment |

### Database Schema

Key collections:
- `users` - User accounts and profiles
- `hotels` - Hotel listings
- `roomTypes` - Room configurations
- `roomAvailability` - Daily availability
- `bookings` - Booking records
- `payments` - Payment transactions
- `reviews` - Hotel reviews

---

## 🔒 Security

### Implemented Security Measures

- ✅ JWT with short-lived access tokens (15 min)
- ✅ Refresh token rotation
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Rate limiting (100 req/min)
- ✅ Input validation with class-validator
- ✅ Role-based access control (RBAC)
- ✅ Ownership verification guards
- ✅ MongoDB injection prevention
- ✅ CORS configuration
- ✅ Brute force protection (5 attempts = 15 min lockout)

---

## 🧪 Testing

### Backend Tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Mobile Testing

- Manual testing in iOS Simulator
- UI tests with XCTest
- Integration tests with API mocking

---

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t dulich-api .

# Run container
docker run -p 3000:3000 dulich-api

# With Docker Compose
docker-compose up -d
```

### Production Deployment

| Component | Recommended Platform |
|-----------|-------------------|
| Backend | Railway, Render |
| Database | MongoDB Atlas M0 |
| Storage | Cloudinary |

---

## 📊 Cost Analysis ($0 MVP)

| Component | Technology | Cost |
|-----------|------------|------|
| Backend | Railway | Free |
| Database | MongoDB Atlas M0 | Free |
| Storage | Cloudinary | Free |
| Auth | JWT (self-hosted) | Free |
| Payment | Mock | Free |
| **Total** | | **$0/month** |

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Nguyễn Duy Hiệu**

- GitHub: [@NguyenDuyHieu49](https://github.com/NguyenDuyHieu49)
- Email: nguyenduyhieuwork49@gmail.com
---

<div align="center">

**Built with ❤️ using SwiftUI, NestJS, and MongoDB**

</div>
