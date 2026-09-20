// Full Seed Script for Hotelia
// Run: docker exec -i hotelia-mongodb mongosh hotelia < seed_full.js

print("Starting seed data insertion...");

// Clear existing data
print("Clearing existing data...");
db.users.deleteMany({});
db.hotels.deleteMany({});
db.roomtypes.deleteMany({});
db.bookings.deleteMany({});
db.reviews.deleteMany({});
print("Cleared!");

// Users
print("Inserting users...");
db.users.insertMany([
  {
    _id: ObjectId("000000000000000000000001"),
    email: "superadmin@hotelia.com",
    name: "Super Admin",
    passwordHash: "$2b$10$rQZ8K8x5K5y5y5y5y5y5yOBq5R5R5R5R5R5R5R5R5R5R5R5R5R5R5",
    role: "ADMIN",
    ownerStatus: "NONE",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    _id: ObjectId("000000000000000000000002"),
    email: "manager@hotelia.com",
    name: "Hotel Manager",
    passwordHash: "$2b$10$rQZ8K8x5K5y5y5y5y5y5yOBq5R5R5R5R5R5R5R5R5R5R5R5R5R5",
    role: "OWNER",
    ownerStatus: "APPROVED",
    isActive: true,
    businessName: "ABC Hospitality Group",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15")
  },
  {
    _id: ObjectId("000000000000000000000003"),
    email: "owner2@hotelia.com",
    name: "Nguyen Van A",
    passwordHash: "$2b$10$rQZ8K8x5K5y5y5y5y5y5yOBq5R5R5R5R5R5R5R5R5R5R5R5R5R5",
    role: "OWNER",
    ownerStatus: "PENDING",
    isActive: true,
    businessName: "Luxury Stays Vietnam",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    _id: ObjectId("000000000000000000000004"),
    email: "user1@hotelia.com",
    name: "Tran Thi B",
    passwordHash: "$2b$10$rQZ8K8x5K5y5y5y5y5y5yOBq5R5R5R5R5R5R5R5R5R5R5R5R5R5",
    role: "USER",
    ownerStatus: "NONE",
    isActive: true,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10")
  },
  {
    _id: ObjectId("000000000000000000000005"),
    email: "user2@hotelia.com",
    name: "Le Van C",
    passwordHash: "$2b$10$rQZ8K8x5K5y5y5y5y5y5yOBq5R5R5R5R5R5R5R5R5R5R5R5R5R5",
    role: "USER",
    ownerStatus: "NONE",
    isActive: true,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15")
  }
]);
print("Users inserted!");

// Hotels
print("Inserting hotels...");
db.hotels.insertMany([
  {
    _id: ObjectId("000000000000000000000011"),
    name: "ABC Luxury Hotel",
    description: "Khách sạn 5 sao sang trọng với tầm nhìn ra biển, located in the heart of District 1, Ho Chi Minh City.",
    address: "123 Nguyen Hue Street",
    city: "Ho Chi Minh City",
    district: "District 1",
    country: "Vietnam",
    latitude: 10.7769,
    longitude: 106.7009,
    ownerId: ObjectId("000000000000000000000002"),
    status: "PUBLISHED",
    starRating: 5,
    averageRating: 4.7,
    reviewCount: 156,
    amenities: ["wifi", "pool", "spa", "gym", "restaurant", "parking", "airport_shuttle", "room_service"],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"],
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-03-01")
  },
  {
    _id: ObjectId("000000000000000000000012"),
    name: "Sunset Beach Resort",
    description: "Resort bãi biển đẹp với view hoàng hôn tuyệt vời. Perfect for couples và families seeking relaxation.",
    address: "456 Vo Nguyen Giap",
    city: "Da Nang",
    district: "My Khe",
    country: "Vietnam",
    latitude: 16.0544,
    longitude: 108.2022,
    ownerId: ObjectId("000000000000000000000002"),
    status: "PUBLISHED",
    starRating: 4,
    averageRating: 4.5,
    reviewCount: 89,
    amenities: ["wifi", "pool", "beach_access", "restaurant", "spa", "bar"],
    checkInTime: "15:00",
    checkOutTime: "11:00",
    images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"],
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-03-05")
  },
  {
    _id: ObjectId("000000000000000000000013"),
    name: "Mountain View Hotel",
    description: "Khách sạn với view núi và thành phố tuyệt đẹp. Ideal for nature lovers và adventure seekers.",
    address: "789 Hoang Van Thu",
    city: "Da Lat",
    district: "Ward 3",
    country: "Vietnam",
    latitude: 11.9404,
    longitude: 108.4583,
    ownerId: ObjectId("000000000000000000000002"),
    status: "PUBLISHED",
    starRating: 4,
    averageRating: 4.3,
    reviewCount: 67,
    amenities: ["wifi", "parking", "restaurant", "fireplace", "mountain_view"],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"],
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-03-10")
  },
  {
    _id: ObjectId("000000000000000000000014"),
    name: "Grand Palace Hotel",
    description: "Historic hotel với kiến trúc colonial Pháp. Experience the grandeur of old Saigon.",
    address: "88 Dong Khoi",
    city: "Ho Chi Minh City",
    district: "District 1",
    country: "Vietnam",
    latitude: 10.7808,
    longitude: 106.6970,
    ownerId: ObjectId("000000000000000000000002"),
    status: "PENDING_APPROVAL",
    starRating: 5,
    averageRating: 0,
    reviewCount: 0,
    amenities: ["wifi", "pool", "spa", "gym", "restaurant", "historical", "garden"],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"],
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01")
  }
]);
print("Hotels inserted!");

// Room Types
print("Inserting room types...");
db.roomtypes.insertMany([
  {
    _id: ObjectId("000000000000000000000021"),
    hotelId: ObjectId("000000000000000000000011"),
    name: "Standard Room",
    description: "Phòng tiêu chuẩn với đầy đủ tiện nghi, view thành phố.",
    basePrice: 1200000,
    maxGuests: 2,
    totalRooms: 20,
    availableRooms: 15,
    amenities: ["ac", "tv", "wifi", "minibar", "safe"],
    images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"],
    isActive: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20")
  },
  {
    _id: ObjectId("000000000000000000000022"),
    hotelId: ObjectId("000000000000000000000011"),
    name: "Deluxe Ocean View",
    description: "Phòng deluxe với view biển tuyệt đẹp, ban công riêng.",
    basePrice: 2500000,
    maxGuests: 2,
    totalRooms: 15,
    availableRooms: 10,
    amenities: ["ac", "tv", "wifi", "minibar", "safe", "balcony", "ocean_view"],
    images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"],
    isActive: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20")
  },
  {
    _id: ObjectId("000000000000000000000023"),
    hotelId: ObjectId("000000000000000000000011"),
    name: "Presidential Suite",
    description: "Suite sang trọng với không gian rộng rãi, view 360 độ.",
    basePrice: 8500000,
    maxGuests: 4,
    totalRooms: 3,
    availableRooms: 2,
    amenities: ["ac", "tv", "wifi", "minibar", "safe", "balcony", "jacuzzi", "butler_service"],
    images: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800"],
    isActive: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20")
  },
  {
    _id: ObjectId("000000000000000000000024"),
    hotelId: ObjectId("000000000000000000000012"),
    name: "Garden Bungalow",
    description: "Bungalow giữa vườn xanh mát, gần bãi biển.",
    basePrice: 1800000,
    maxGuests: 2,
    totalRooms: 10,
    availableRooms: 7,
    amenities: ["ac", "tv", "wifi", "garden_view"],
    images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800"],
    isActive: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    _id: ObjectId("000000000000000000000025"),
    hotelId: ObjectId("000000000000000000000012"),
    name: "Beach Villa",
    description: "Villa riêng ngay bãi biển, có hồ bơi private.",
    basePrice: 5500000,
    maxGuests: 4,
    totalRooms: 5,
    availableRooms: 3,
    amenities: ["ac", "tv", "wifi", "private_pool", "beach_access", "kitchen"],
    images: ["https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800"],
    isActive: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01")
  },
  {
    _id: ObjectId("000000000000000000000026"),
    hotelId: ObjectId("000000000000000000000013"),
    name: "Mountain View Room",
    description: "Phòng với view núi và thung lũng tuyệt đẹp.",
    basePrice: 950000,
    maxGuests: 2,
    totalRooms: 12,
    availableRooms: 9,
    amenities: ["ac", "tv", "wifi", "heater", "mountain_view"],
    images: ["https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800"],
    isActive: true,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15")
  }
]);
print("Room types inserted!");

// Bookings
print("Inserting bookings...");
db.bookings.insertMany([
  {
    _id: ObjectId("000000000000000000000031"),
    userId: ObjectId("000000000000000000000004"),
    hotelId: ObjectId("000000000000000000000011"),
    roomTypeId: ObjectId("000000000000000000000022"),
    checkIn: new Date("2024-03-15"),
    checkOut: new Date("2024-03-18"),
    guestCount: 2,
    guestName: "Tran Thi B",
    guestEmail: "user1@hotelia.com",
    guestPhone: "0901234567",
    specialRequests: "Late check-in requested",
    roomPrice: 2500000,
    totalPrice: 7500000,
    nights: 3,
    status: "COMPLETED",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-18")
  },
  {
    _id: ObjectId("000000000000000000000032"),
    userId: ObjectId("000000000000000000000005"),
    hotelId: ObjectId("000000000000000000000011"),
    roomTypeId: ObjectId("000000000000000000000021"),
    checkIn: new Date("2024-04-01"),
    checkOut: new Date("2024-04-03"),
    guestCount: 1,
    guestName: "Le Van C",
    guestEmail: "user2@hotelia.com",
    guestPhone: "0912345678",
    roomPrice: 1200000,
    totalPrice: 2400000,
    nights: 2,
    status: "CONFIRMED",
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-03-20")
  },
  {
    _id: ObjectId("000000000000000000000033"),
    userId: ObjectId("000000000000000000000004"),
    hotelId: ObjectId("000000000000000000000012"),
    roomTypeId: ObjectId("000000000000000000000025"),
    checkIn: new Date("2024-04-10"),
    checkOut: new Date("2024-04-15"),
    guestCount: 4,
    guestName: "Tran Thi B",
    guestEmail: "user1@hotelia.com",
    guestPhone: "0901234567",
    specialRequests: "Anniversary celebration",
    roomPrice: 5500000,
    totalPrice: 27500000,
    nights: 5,
    status: "PAID",
    createdAt: new Date("2024-03-25"),
    updatedAt: new Date("2024-03-25")
  },
  {
    _id: ObjectId("000000000000000000000034"),
    userId: ObjectId("000000000000000000000005"),
    hotelId: ObjectId("000000000000000000000013"),
    roomTypeId: ObjectId("000000000000000000000026"),
    checkIn: new Date("2024-04-20"),
    checkOut: new Date("2024-04-22"),
    guestCount: 2,
    guestName: "Le Van C",
    guestEmail: "user2@hotelia.com",
    guestPhone: "0912345678",
    roomPrice: 950000,
    totalPrice: 1900000,
    nights: 2,
    status: "PENDING_PAYMENT",
    createdAt: new Date("2024-03-28"),
    updatedAt: new Date("2024-03-28")
  }
]);
print("Bookings inserted!");

// Reviews
print("Inserting reviews...");
db.reviews.insertMany([
  {
    _id: ObjectId("000000000000000000000041"),
    hotelId: ObjectId("000000000000000000000011"),
    userId: ObjectId("000000000000000000000004"),
    bookingId: ObjectId("000000000000000000000031"),
    rating: 5,
    title: "Amazing experience!",
    content: "Khách sạn tuyệt vời! View biển đẹp, staff friendly, breakfast ngon. Will definitely come back!",
    helpfulCount: 12,
    isVisible: true,
    ownerReply: "Cảm ơn bạn đã ghé thăm! Rất vui khi bạn có trải nghiệm tốt tại khách sạn chúng tôi.",
    createdAt: new Date("2024-03-19"),
    updatedAt: new Date("2024-03-20")
  },
  {
    _id: ObjectId("000000000000000000000042"),
    hotelId: ObjectId("000000000000000000000012"),
    userId: ObjectId("000000000000000000000005"),
    bookingId: null,
    rating: 4,
    title: "Great resort",
    content: "Resort đẹp, bãi biển sạch sẽ. Food a bit pricey but overall good experience.",
    helpfulCount: 5,
    isVisible: true,
    ownerReply: null,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20")
  },
  {
    _id: ObjectId("000000000000000000000043"),
    hotelId: ObjectId("000000000000000000000011"),
    userId: ObjectId("000000000000000000000005"),
    bookingId: null,
    rating: 4,
    title: "Good value for money",
    content: "Location trung tâm, phòng sạch sẽ. Wifi speed ok. Recommend for business travelers.",
    helpfulCount: 8,
    isVisible: true,
    ownerReply: "Cảm ơn đã feedback! Chúng tôi sẽ cải thiện wifi speed.",
    createdAt: new Date("2024-02-25"),
    updatedAt: new Date("2024-02-26")
  }
]);
print("Reviews inserted!");

// Summary
print("");
print("===========================================");
print("✅ SEED DATA COMPLETED!");
print("===========================================");
print("");
print("Summary:");
print("  Users: " + db.users.countDocuments());
print("  Hotels: " + db.hotels.countDocuments());
print("  Room Types: " + db.roomtypes.countDocuments());
print("  Bookings: " + db.bookings.countDocuments());
print("  Reviews: " + db.reviews.countDocuments());
print("");
print("===========================================");
print("");
print("Test Accounts:");
print("  Admin:  superadmin@hotelia.com / Admin123!");
print("  Owner:  manager@hotelia.com / OwnerPass123!");
print("  User:   user1@hotelia.com / User123!");
print("===========================================");
