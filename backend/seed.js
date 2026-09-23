// Seed data for Hotelia - Node.js version
// Run: node seed.js

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotelia';

// Simple ObjectId generator for Node.js
const ObjectId = () => new mongoose.Types.ObjectId();

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  passwordHash: String,
  role: String,
  ownerStatus: String,
  isActive: Boolean,
  phone: String,
  avatar: String,
  createdAt: Date,
  updatedAt: Date
});

// Hotel Schema
const hotelSchema = new mongoose.Schema({
  name: String,
  description: String,
  address: String,
  city: String,
  district: String,
  country: String,
  latitude: Number,
  longitude: Number,
  starRating: Number,
  averageRating: Number,
  reviewCount: Number,
  amenities: [String],
  images: [String],
  status: String,
  ownerId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

// Room Type Schema
const roomTypeSchema = new mongoose.Schema({
  hotelId: mongoose.Schema.Types.ObjectId,
  name: String,
  description: String,
  basePrice: Number,
  maxGuests: Number,
  totalRooms: Number,
  availableRooms: Number,
  amenities: [String],
  images: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await mongoose.connection.db.dropDatabase();
    console.log('Database cleared');

    // Create collections
    const User = mongoose.model('User', userSchema);
    const Hotel = mongoose.model('Hotel', hotelSchema);
    const RoomType = mongoose.model('RoomType', roomTypeSchema);

    // Users
    const users = [
      {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@hotelia.com',
        name: 'Super Admin',
        passwordHash: '$2b$10$9u1dvJco6onDWwTBvvVA6O0JEFhkdqgEkYZsoS8Fi1oLADetdZPlq',
        role: 'ADMIN',
        ownerStatus: 'NONE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        email: 'owner@hotelia.com',
        name: 'Hotel Owner',
        passwordHash: '$2b$10$9u1dvJco6onDWwTBvvVA6O0JEFhkdqgEkYZsoS8Fi1oLADetdZPlq',
        role: 'OWNER',
        ownerStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await User.insertMany(users);
    console.log(`Created ${users.length} users`);

    // Hotels
    const cities = ['Hà Nội', 'TP HCM', 'Đà Nẵng', 'Nha Trang', 'Phú Quốc'];
    const hotels = [];

    for (let i = 1; i <= 20; i++) {
      const hotel = {
        _id: new mongoose.Types.ObjectId(),
        name: `Khách Sạn ${i} Stars`,
        description: `Khách sạn cao cấp với view đẹp và dịch vụ tuyệt vời`,
        address: `Địa chỉ ${i}`,
        city: cities[i % cities.length],
        district: 'Quận ' + (i % 10 + 1),
        country: 'Việt Nam',
        latitude: 16.0 + Math.random() * 2,
        longitude: 108.0 + Math.random() * 2,
        starRating: (i % 5) + 1,
        averageRating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 500) + 10,
        amenities: ['Wifi', 'Pool', 'Gym', 'Spa', 'Restaurant'],
        images: [`https://picsum.photos/seed/hotel${i}/800/600`],
        status: 'PUBLISHED',
        ownerId: users[1]._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      hotels.push(hotel);
    }

    await Hotel.insertMany(hotels);
    console.log(`Created ${hotels.length} hotels`);

    // Room Types
    const roomTypes = [];
    const roomNames = ['Standard', 'Deluxe', 'Suite', 'VIP'];

    for (const hotel of hotels) {
      for (let j = 0; j < 3; j++) {
        const roomType = {
          _id: new mongoose.Types.ObjectId(),
          hotelId: hotel._id,
          name: `${roomNames[j]} Room`,
          description: `Phòng ${roomNames[j]} với đầy đủ tiện nghi`,
          basePrice: (j + 1) * 500000 + Math.floor(Math.random() * 500000),
          maxGuests: 2 + j,
          totalRooms: 10 + j * 5,
          availableRooms: 5 + j * 2,
          amenities: ['TV', 'AC', 'Minibar', 'Safe'],
          images: [`https://picsum.photos/seed/room${hotel._id}${j}/800/600`],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        roomTypes.push(roomType);
      }
    }

    await RoomType.insertMany(roomTypes);
    console.log(`Created ${roomTypes.length} room types`);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTest accounts:');
    console.log('  Admin: admin@hotelia.com');
    console.log('  Owner: owner@hotelia.com');
    console.log('  (Password: ask admin to set)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
