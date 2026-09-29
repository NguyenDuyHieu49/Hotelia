// Run against an isolated local MongoDB replica set: npm run build && node scripts/test-booking-concurrency.cjs
const assert = require('node:assert/strict');
const { createConnection, Types } = require('mongoose');
const { Booking, BookingSchema } = require('../dist/bookings/schemas/booking.schema');
const { BookingsService } = require('../dist/bookings/bookings.service');

async function main() {
  const dbName = `hotelia_booking_test_${Date.now()}_${process.pid}`;
  const connection = await createConnection(`mongodb://127.0.0.1:27018/${dbName}?directConnection=true`).asPromise();
  try {
    const bookingModel = connection.model(Booking.name, BookingSchema);
    await bookingModel.init();
    const hotelId = new Types.ObjectId();
    const roomTypeId = new Types.ObjectId();
    await connection.db.collection('hotels').insertOne({ _id: hotelId, name: 'Isolated test hotel', status: 'PUBLISHED' });
    await connection.db.collection('roomtypes').insertOne({ _id: roomTypeId, hotelId, name: 'One room', isActive: true,
      maxGuests: 2, basePrice: 500000, totalRooms: 1, inventoryVersion: 0 });
    const service = new BookingsService(bookingModel, {}, {}, connection);
    const checkIn = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const dto = { hotelId: String(hotelId), roomTypeId: String(roomTypeId), checkIn, checkOut,
      guestCount: 1, guestName: 'Test Guest', guestEmail: 'guest@example.com', guestPhone: '0900000000' };
    const userA = String(new Types.ObjectId());
    const userB = String(new Types.ObjectId());
    const keyA = 'f50ccce4-b2c9-4919-ac54-a54b3c068001';
    const keyB = 'f50ccce4-b2c9-4919-ac54-a54b3c068002';
    const results = await Promise.allSettled([service.create(userA, dto, keyA), service.create(userB, dto, keyB)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1, 'exactly one customer should book');
    assert.equal(await bookingModel.countDocuments(), 1, 'no oversell');
    const winner = results[0].status === 'fulfilled' ? { user: userA, key: keyA, booking: results[0].value }
      : { user: userB, key: keyB, booking: results[1].value };
    const replay = await service.create(winner.user, dto, winner.key);
    assert.equal(String(replay._id), String(winner.booking._id), 'retry should return original booking');
    assert.equal(await bookingModel.countDocuments(), 1, 'retry should not create another booking');
    await assert.rejects(service.create(winner.user, { ...dto, guestCount: 2 }, winner.key), /nội dung khác/);
    const secondRoomId = new Types.ObjectId();
    await connection.db.collection('roomtypes').insertOne({ _id: secondRoomId, hotelId, name: 'Second room type', isActive: true,
      maxGuests: 2, basePrice: 600000, totalRooms: 1, inventoryVersion: 0 });
    const repeatedDto = { ...dto, roomTypeId: String(secondRoomId) };
    const repeatedKey = 'f50ccce4-b2c9-4919-ac54-a54b3c068003';
    const repeated = await Promise.allSettled([
      service.create(userA, repeatedDto, repeatedKey), service.create(userA, repeatedDto, repeatedKey),
    ]);
    assert.ok(repeated.every(r => r.status === 'fulfilled'), 'same-key concurrent retries should both succeed');
    assert.equal(String(repeated[0].value._id), String(repeated[1].value._id));
    assert.equal(await bookingModel.countDocuments(), 2, 'same-key requests should create one new booking');
    console.log('PASS: two customers, one room; concurrent and later retries return one booking; changed retry rejected.');
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
