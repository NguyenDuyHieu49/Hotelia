/* Activate the 80 exploration listings with deterministic owners, rooms, rates and stock.
 * Dry run by default. Use --apply to mutate the configured MongoDB database.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const catalog = require('../data/explore-hotels.v2.json');
const baseCatalog = require('../data/real-hotels.v1.json');
const { VERSION, buildOperationalCatalog } = require('./operational-catalog-data.cjs');

const args = process.argv.slice(2);
assert(args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const oid = value => new mongoose.Types.ObjectId(value);
const operational = buildOperationalCatalog(catalog.hotels);

function hash(value) {
  return crypto.createHash('sha256')
    .update(mongoose.mongo.BSON.EJSON.stringify(value, { relaxed: false }))
    .digest('hex');
}

async function run() {
  assert.equal(baseCatalog.hotels.length, 20);
  assert.equal(catalog.hotels.length, 80);
  assert.equal(operational.length, 80);
  assert.equal(new Set(operational.map(entry => entry.id)).size, 80);
  assert.equal(new Set(operational.map(entry => entry.owner.id)).size, 80);
  assert.equal(new Set(operational.flatMap(entry => entry.rooms.map(room => room.id))).size, 320);

  for (const entry of operational) {
    assert.equal(entry.rooms.length, 4);
    assert(entry.rooms.every(room => room.basePrice > 0 && room.totalRooms > 0 && room.maxGuests >= 2));
    assert(entry.owner.email.endsWith('@owners.hotelia.invalid'));
  }

  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  assert(uri, 'MONGODB_URI is not configured');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  assert(db, 'MongoDB connection is unavailable');
  assert.equal(db.databaseName, 'test', 'Unexpected database; inspect before applying');

  const hotels = db.collection('hotels');
  const roomTypes = db.collection('roomtypes');
  const users = db.collection('users');
  const hotelIds = operational.map(entry => oid(entry.id));
  const roomIds = operational.flatMap(entry => entry.rooms.map(room => oid(room.id)));
  const ownerIds = operational.map(entry => oid(entry.owner.id));
  const [currentHotels, currentRooms, currentOwners, totalHotels] = await Promise.all([
    hotels.find({ _id: { $in: hotelIds } }).sort({ _id: 1 }).toArray(),
    roomTypes.find({ hotelId: { $in: hotelIds } }).sort({ _id: 1 }).toArray(),
    users.find({ _id: { $in: ownerIds } }).sort({ _id: 1 }).toArray(),
    hotels.countDocuments(),
  ]);
  assert.equal(totalHotels, 100, 'Expected the existing 100-hotel catalog');
  assert.equal(currentHotels.length, 80, 'The 80 exploration listings must exist');

  for (const entry of operational) {
    const existing = currentHotels.find(hotel => String(hotel._id) === entry.id);
    assert(existing, `Missing catalog hotel: ${entry.hotel.name}`);
    assert.equal(existing.name, entry.hotel.name);
    const alreadyActivated = existing.dataProvenance?.operationalCatalog?.version === VERSION;
    assert(existing.isDemoCatalog === true || alreadyActivated, `Unexpected listing state: ${entry.hotel.name}`);
  }

  const alreadyApplied = currentHotels.every(hotel =>
    hotel.isDemoCatalog === false && hotel.dataProvenance?.operationalCatalog?.version === VERSION)
    && currentRooms.length === 320
    && currentOwners.length === 80;
  const plan = {
    version: VERSION,
    database: db.databaseName,
    hotels: 80,
    owners: 80,
    roomTypes: 320,
    priceRange: [
      Math.min(...operational.flatMap(entry => entry.rooms.map(room => room.basePrice))),
      Math.max(...operational.flatMap(entry => entry.rooms.map(room => room.basePrice))),
    ],
  };
  if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'already-applied', ...plan }, null, 2));
    return;
  }
  assert.equal(currentRooms.length, 0, 'Unexpected room data exists for exploration listings');
  assert.equal(currentOwners.length, 0, 'Unexpected managed owners already exist');
  if (!apply) {
    console.log(JSON.stringify({ status: 'dry-run', ...plan }, null, 2));
    return;
  }

  const backupDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backupPath = path.join(backupDir, `operational-catalog-before-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath, mongoose.mongo.BSON.EJSON.stringify({
    version: VERSION,
    database: db.databaseName,
    hotels: currentHotels,
    roomtypes: currentRooms,
    users: currentOwners,
  }, null, 2, { relaxed: false }), { flag: 'wx', mode: 0o600 });

  // Managed accounts cannot sign in. A verified operator can claim the listing later
  // through the normal account flow without distributing seed passwords.
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(48).toString('base64url'), 12);
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const unchangedHotels = await hotels.find({ _id: { $in: hotelIds } }, { session }).sort({ _id: 1 }).toArray();
      assert.equal(hash(unchangedHotels), hash(currentHotels), 'Catalog changed after validation');
      for (const entry of operational) {
        const ownerId = oid(entry.owner.id);
        const hotelId = oid(entry.id);
        const ownerResult = await users.insertOne({
          _id: ownerId,
          email: entry.owner.email,
          passwordHash: unusablePasswordHash,
          name: entry.owner.name,
          role: 'OWNER',
          ownerStatus: 'APPROVED',
          isActive: false,
          tokenVersion: 0,
          businessName: entry.owner.businessName,
          managedCatalogAccount: true,
          createdAt: now,
          updatedAt: now,
        }, { session });
        assert(ownerResult.insertedId.equals(ownerId));

        const hotelResult = await hotels.updateOne({ _id: hotelId, name: entry.hotel.name, isDemoCatalog: true }, {
          $set: {
            ownerId,
            status: 'PUBLISHED',
            isDemoCatalog: false,
            starRating: entry.hotel.starRating,
            amenities: entry.hotel.amenities,
            description: entry.hotel.description,
            'dataProvenance.operationalCatalog': {
              version: VERSION,
              generatedAt: now,
              rates: 'generated',
              inventory: 'generated',
              ownership: 'managed_unclaimed',
              verificationStatus: 'AWAITING_PROPERTY_CONFIRMATION',
            },
            updatedAt: now,
          },
        }, { session });
        assert.equal(hotelResult.matchedCount, 1);

        for (const room of entry.rooms) {
          const roomId = oid(room.id);
          const roomResult = await roomTypes.insertOne({
            _id: roomId,
            hotelId,
            name: room.name,
            description: room.description,
            basePrice: room.basePrice,
            maxGuests: room.maxGuests,
            totalRooms: room.totalRooms,
            availableRooms: room.availableRooms,
            amenities: room.amenities,
            images: room.images,
            isActive: room.isActive,
            inventoryVersion: 0,
            catalogProvenance: { version: VERSION, generatedAt: now },
            createdAt: now,
            updatedAt: now,
          }, { session });
          assert(roomResult.insertedId.equals(roomId));
        }
      }

      const [activated, rooms, owners, allBookable] = await Promise.all([
        hotels.countDocuments({ _id: { $in: hotelIds }, status: 'PUBLISHED', isDemoCatalog: false }, { session }),
        roomTypes.countDocuments({ _id: { $in: roomIds }, isActive: true, totalRooms: { $gt: 0 }, basePrice: { $gt: 0 } }, { session }),
        users.countDocuments({ _id: { $in: ownerIds }, role: 'OWNER', managedCatalogAccount: true }, { session }),
        hotels.aggregate([
          { $match: { status: 'PUBLISHED', isDemoCatalog: { $ne: true } } },
          { $lookup: { from: 'roomtypes', localField: '_id', foreignField: 'hotelId', as: 'rooms' } },
          { $match: { rooms: { $elemMatch: { isActive: true, totalRooms: { $gt: 0 }, basePrice: { $gt: 0 }, maxGuests: { $gte: 1 } } } } },
          { $count: 'count' },
        ], { session }).toArray(),
      ]);
      assert.equal(activated, 80);
      assert.equal(rooms, 320);
      assert.equal(owners, 80);
      assert.equal(allBookable[0]?.count, 100, 'All 100 listings must be bookable after activation');
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }

  console.log(JSON.stringify({ status: 'committed', ...plan, finalBookableHotels: 100, backupPath }, null, 2));
}

run().catch(error => {
  console.error('Operational catalog migration failed:', error.name, error.code || '', error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
