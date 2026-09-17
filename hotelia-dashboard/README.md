# Hotelia Dashboard

Professional dashboard for Hotelia hotel booking platform.

## Tech Stack

- **React 18** + **TypeScript**
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Recharts** - Charts
- **Lucide React** - Icons
- **Vite** - Build tool

## Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Card, Badge, etc.)
│   └── layout/       # Layout components (Sidebar, Layout)
├── features/
│   ├── auth/         # Login page
│   ├── owner/        # Owner dashboard pages
│   └── admin/        # Admin dashboard pages
├── lib/
│   ├── api/          # API client and endpoints
│   └── auth/         # Auth context and hooks
├── types/            # TypeScript types
└── styles/           # Global styles and tokens
```

## Getting Started

### 1. Install dependencies

```bash
cd hotelia-dashboard
npm install
```

### 2. Configure API URL

Create `.env` file:
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

### 3. Run development server

```bash
npm run dev
```

### 4. Open browser

Navigate to: http://localhost:5174

## Demo Accounts

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@hotelia.com      | Admin123!  |
| Owner | owner@hotelia.com     | Owner123!  |

## Features

### Admin Dashboard
- Dashboard overview with stats
- User management (view, suspend, activate)
- Hotel Owner verification
- Hotel approval queue
- Booking management
- Review management

### Owner Dashboard
- Revenue overview
- Hotel management
- Room type management
- Booking management
- Review responses
- Analytics

## Design System

### Owner Theme (Modern Hospitality)
- Primary: Teal (#0F766E)
- Background: Warm (#F8F7F4)

### Admin Theme (Enterprise Operations)
- Primary: Blue (#2563EB)
- Sidebar: Dark Navy (#172033)
- Background: Light (#F8FAFC)

## API Endpoints

The dashboard connects to NestJS backend at `/api/v1`:

- `POST /auth/login` - Login
- `GET /users/me` - Get current user
- `GET /admin/stats` - Dashboard stats
- `GET /admin/users` - User list
- `GET /admin/owners/pending` - Pending owners
- `GET /admin/hotels/pending` - Pending hotels
- `GET /hotels/owner/my-hotels` - Owner's hotels
- `GET /bookings` - Bookings list
- `GET /reviews/my-reviews` - Owner's reviews
