// Run against an isolated local MongoDB replica set on port 27018: npm run build && npm run test:booking-db
const assert = require('node:assert/strict');
const { createConnection, Types } = require('mongoose');
const { Booking, BookingSchema } = require('../dist/bookings/schemas/booking.schema');
const { BookingsService } = require('../dist/bookings/bookings.service');
const { BookingStateService } = require('../dist/bookings/booking-state.service');

async function main() {
  const dbName = `hotelia_booking_test_${Date.now()}_${process.pid}`;
  const connection = await createConnection(`mongodb://127.0.0.1:27018/${dbName}?directConnection=true`).asPromise();
  try {
    const bookingModel = connection.model(Booking.name, BookingSchema);
    await bookingModel.init();
    const hotelId = new Types.ObjectId();
    const roomTypeId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    await connection.db.collection('hotels').insertOne({ _id: hotelId, ownerId, name: 'Isolated test hotel', status: 'PUBLISHED' });
    await connection.db.collection('roomtypes').insertOne({ _id: roomTypeId, hotelId, name: 'One room', isActive: true,
      maxGuests: 2, basePrice: 500000, totalRooms: 1, inventoryVersion: 0 });
    const service = new BookingsService(bookingModel, new BookingStateService(), {
      findById: async () => ({ _id: hotelId, ownerId }),
    }, connection);
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

    const lifecycleRoomId = new Types.ObjectId();
    await connection.db.collection('roomtypes').insertOne({ _id: lifecycleRoomId, hotelId, name: 'Lifecycle room', isActive: true,
      maxGuests: 2, basePrice: 700000, totalRooms: 1, inventoryVersion: 0 });
    const lifecycleDto = { ...dto, roomTypeId: String(lifecycleRoomId) };
    const expired = await service.create(userA, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068004');
    await bookingModel.updateOne({ _id: expired._id }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await service.create(userA, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068004')).status, 'EXPIRED', 'retry reports expiry');
    await assert.rejects(service.confirmPayAtHotel(String(expired._id), userA), /không còn chờ/);

    const pending = await service.create(userB, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068005');
    assert.equal((await service.cancel(String(pending._id), userB, {})).status, 'CANCELLED');
    const confirmed = await service.create(userA, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068006');
    assert.equal((await service.confirmPayAtHotel(String(confirmed._id), userA)).paymentMethod, 'PAY_AT_HOTEL');
    assert.equal((await service.confirmPayAtHotel(String(confirmed._id), userA)).status, 'CONFIRMED', 'confirmation retry succeeds');
    assert.equal((await service.cancel(String(confirmed._id), userA, {})).status, 'CANCEL_REQUESTED');
    await assert.rejects(service.create(userB, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068007'), /đã hết/);
    assert.equal((await service.resolveCancellation(String(confirmed._id), String(ownerId), 'OWNER')).status, 'CANCELLED');
    assert.equal((await service.create(userB, lifecycleDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068008')).status, 'PENDING_PAYMENT');

    const stayRoomId = new Types.ObjectId();
    await connection.db.collection('roomtypes').insertOne({ _id: stayRoomId, hotelId, name: 'Today room', isActive: true,
      maxGuests: 2, basePrice: 800000, totalRooms: 1, inventoryVersion: 0 });
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
    const stayDto = { ...dto, roomTypeId: String(stayRoomId), checkIn: today, checkOut: tomorrow };
    const stay = await service.create(userA, stayDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068009');
    await service.confirmPayAtHotel(String(stay._id), userA);
    await assert.rejects(service.checkIn(String(stay._id), userB), /Not your hotel/);
    assert.equal((await service.checkIn(String(stay._id), String(ownerId))).status, 'CHECKED_IN');
    assert.equal((await service.checkIn(String(stay._id), String(ownerId))).status, 'CHECKED_IN', 'check-in retry succeeds');
    assert.equal((await service.checkOut(String(stay._id), String(ownerId))).status, 'CHECKED_OUT');
    assert.equal((await service.checkOut(String(stay._id), String(ownerId))).status, 'CHECKED_OUT', 'check-out retry succeeds');
    await assert.rejects(service.create(userB, stayDto, 'f50ccce4-b2c9-4919-ac54-a54b3c068010'), /đã hết/);
    assert.equal(await connection.db.collection('payments').countDocuments(), 0, 'pay-at-hotel does not record an online payment');
    console.log('PASS: contention, retry, expiry, cancellation, pay-at-hotel, owner check-in/out and occupied stay dates.');
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
