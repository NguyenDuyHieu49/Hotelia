// User & Auth
export type UserRole = 'USER' | 'OWNER' | 'ADMIN';
export type OwnerStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  ownerStatus: OwnerStatus;
  businessName?: string;
  businessLicense?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// Hotel
export type HotelStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';

export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  district?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  ownerId: string;
  owner?: User;
  status: HotelStatus;
  starRating: number;
  averageRating: number;
  reviewCount: number;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  images: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Room Type
export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  totalRooms: number;
  availableRooms: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Room
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'BLOCKED';

export interface Room {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomType?: RoomType;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
}

// Booking
export type BookingStatus = 
  | 'PENDING_PAYMENT' 
  | 'PAID' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'CHECKED_OUT' 
  | 'COMPLETED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface Booking {
  id: string;
  userId: string;
  user?: User;
  hotelId: string;
  hotel?: Hotel;
  roomTypeId: string;
  roomType?: RoomType;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  roomPrice: number;
  totalPrice: number;
  nights: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

// Payment
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';

export interface Payment {
  id: string;
  bookingId: string;
  booking?: Booking;
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// Review
export interface Review {
  id: string;
  hotelId: string;
  hotel?: Hotel;
  userId: string;
  user?: User;
  bookingId: string;
  rating: number;
  title?: string;
  content: string;
  helpfulCount: number;
  isVisible: boolean;
  ownerReply?: string;
  createdAt: string;
  updatedAt: string;
}

// Complaint
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'WAITING_FOR_RESPONSE' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Complaint {
  id: string;
  userId: string;
  user?: User;
  bookingId?: string;
  booking?: Booking;
  hotelId?: string;
  hotel?: Hotel;
  type: string;
  priority: ComplaintPriority;
  subject: string;
  content: string;
  status: ComplaintStatus;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  actorId: string;
  actor?: User;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE';
  reason?: string;
  ip?: string;
  createdAt: string;
}

// Stats
export interface DashboardStats {
  totalUsers: number;
  totalOwners: number;
  totalHotels: number;
  totalBookings: number;
  totalRevenue: number;
  todayBookings: number;
  pendingOwners: number;
  pendingHotels: number;
  pendingComplaints: number;
}

export interface OwnerStats {
  todayRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  averageRating: number;
  availableRooms: number;
  pendingBookings: number;
}
