const crypto = require('node:crypto');

const VERSION = 'operational-catalog-2026-10-23-v1';

const CITY_BASE_PRICE = {
  'TP HCM': 950000,
  'Hà Nội': 900000,
  'Đà Nẵng': 850000,
  'Nha Trang': 850000,
  'Phú Quốc': 1050000,
  'Hội An': 800000,
  'Hạ Long': 850000,
  'Hải Phòng': 700000,
  'Lạng Sơn': 600000,
  'Cần Thơ': 600000,
  'Cam Ranh': 850000,
  'Huế': 650000,
  'Quy Nhơn': 700000,
  'Đà Lạt': 750000,
};

const ROOM_TEMPLATES = [
  {
    key: 'superior', name: 'Superior Room', priceFactor: 1,
    maxGuests: 2, stockBase: 18,
    amenities: ['wifi', 'air_conditioning', 'television', 'minibar', 'work_desk'],
  },
  {
    key: 'deluxe', name: 'Deluxe King Room', priceFactor: 1.35,
    maxGuests: 2, stockBase: 14,
    amenities: ['wifi', 'air_conditioning', 'television', 'minibar', 'king_bed', 'city_view'],
  },
  {
    key: 'twin', name: 'Premier Twin Room', priceFactor: 1.55,
    maxGuests: 3, stockBase: 10,
    amenities: ['wifi', 'air_conditioning', 'television', 'minibar', 'twin_beds', 'breakfast'],
  },
  {
    key: 'family-suite', name: 'Family Suite', priceFactor: 2.2,
    maxGuests: 4, stockBase: 6,
    amenities: ['wifi', 'air_conditioning', 'television', 'minibar', 'living_area', 'breakfast'],
  },
];

function digest(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function objectIdHex(value) {
  return digest(value).toString('hex').slice(0, 24);
}

function catalogHotelId(hotel, index) {
  const catalogVersion = index < 30 ? 'v1' : 'v2';
  return objectIdHex(`hotelia-explore-${catalogVersion}:${hotel.name}`);
}

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inferredStars(name) {
  const normalized = name.toLowerCase();
  if (/four seasons|luxury|marriott|sheraton|anantara|movenpick|mövenpick|vinpearl|flc grand|flc luxury/.test(normalized)) return 5;
  if (/resort|spa|wyndham|melia|meliá|azerai|somerset|citadines|muong thanh|mường thanh|golden bay/.test(normalized)) return 4;
  return 3;
}

function hotelAmenities(name, city, stars) {
  const normalized = `${name} ${city}`.toLowerCase();
  const values = ['wifi', 'restaurant', 'front_desk_24h', 'housekeeping'];
  if (stars >= 4) values.push('pool', 'gym', 'spa', 'airport_transfer');
  if (/resort|beach|nha trang|phu quoc|phú quốc|da nang|đà nẵng|quy nhon|quy nhơn|ha long|hạ long|cam ranh/.test(normalized)) {
    values.push('outdoor_pool', 'family_friendly');
  }
  if (/apartment|residence|somerset|citadines/.test(normalized)) values.push('kitchenette', 'laundry');
  return [...new Set(values)];
}

function roundPrice(value) {
  return Math.max(450000, Math.round(value / 50000) * 50000);
}

function operationalHotel(hotel, index) {
  const hash = digest(`${VERSION}:${hotel.name}`);
  const hotelId = catalogHotelId(hotel, index);
  const stars = inferredStars(hotel.name);
  const ownerId = objectIdHex(`${VERSION}:owner:${hotel.name}`);
  const tierFactor = 0.85 + stars * 0.1 + (hash[0] % 9) * 0.025;
  const basePrice = roundPrice((CITY_BASE_PRICE[hotel.city] || 700000) * tierFactor);
  const rooms = ROOM_TEMPLATES.map((template, roomIndex) => {
    const roomHash = digest(`${VERSION}:${hotel.name}:${template.key}`);
    const totalRooms = template.stockBase + roomHash[0] % 13;
    return {
      id: objectIdHex(`${VERSION}:room:${hotel.name}:${template.key}`),
      name: template.name,
      description: `${template.name} tại ${hotel.name}, phù hợp tối đa ${template.maxGuests} khách.`,
      basePrice: roundPrice(basePrice * template.priceFactor * (0.97 + (roomHash[1] % 7) * 0.01)),
      maxGuests: template.maxGuests,
      totalRooms,
      availableRooms: totalRooms,
      amenities: template.amenities,
      images: [],
      isActive: true,
      displayOrder: roomIndex + 1,
    };
  });
  return {
    id: hotelId,
    owner: {
      id: ownerId,
      email: `catalog-owner-${slug(hotel.name)}-${ownerId.slice(-6)}@owners.hotelia.invalid`,
      name: `Quản lý ${hotel.name}`,
      businessName: hotel.name,
    },
    hotel: {
      name: hotel.name,
      city: hotel.city,
      starRating: stars,
      amenities: hotelAmenities(hotel.name, hotel.city, stars),
      description: `${hotel.name} cung cấp các lựa chọn lưu trú tại ${hotel.city}, với phòng cho khách cá nhân, cặp đôi và gia đình.`,
    },
    rooms,
  };
}

function buildOperationalCatalog(hotels) {
  return hotels.map(operationalHotel);
}

module.exports = {
  VERSION,
  CITY_BASE_PRICE,
  ROOM_TEMPLATES,
  buildOperationalCatalog,
  catalogHotelId,
  inferredStars,
  objectIdHex,
};
