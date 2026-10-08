/* Scoped, idempotent catalog expansion. Dry run unless --apply is passed. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { editorialData } = require('./editorial-review-data.cjs');
const catalog = require('../data/explore-hotels.v2.json');
const baseCatalog = require('../data/real-hotels.v1.json');

const args = process.argv.slice(2);
assert(args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const objectId = (name, version) => new mongoose.Types.ObjectId(
  crypto.createHash('sha256').update(`hotelia-explore-${version}:${name}`).digest('hex').slice(0, 24)
);
const catalogId = (hotel, index) => objectId(hotel.name, index < 30 ? 'v1' : 'v2');

async function run() {
  assert.equal(baseCatalog.hotels.length, 20);
  assert.equal(catalog.hotels.length, 80);
  const allNames = [...baseCatalog.hotels.map(h => h.fields.name), ...catalog.hotels.map(h => h.name)];
  assert.equal(new Set(allNames.map(name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).size, 100);
  for (const [index, hotel] of catalog.hotels.entries()) {
    assert(hotel.name && hotel.city && hotel.source);
    if (index >= 30) assert(hotel.sourceLocationId && Number.isFinite(hotel.latitude) && Number.isFinite(hotel.longitude));
  }

  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, 'test', 'Unexpected database; inspect before applying');
  const hotels = db.collection('hotels');
  const baseIds = baseCatalog.hotels.map(h => new mongoose.Types.ObjectId(h.id));
  const demoIds = catalog.hotels.map(catalogId);
  const [base, existing, total] = await Promise.all([
    hotels.find({ _id: { $in: baseIds } }).toArray(),
    hotels.find({ _id: { $in: demoIds } }).toArray(),
    hotels.countDocuments(),
  ]);
  assert.equal(base.length, 20, 'The 20 original listings must exist');
  for (const source of baseCatalog.hotels) {
    assert.equal(base.find(hotel => String(hotel._id) === source.id)?.name, source.fields.name);
  }
  for (const [index, source] of catalog.hotels.entries()) {
    const old = existing.find(hotel => hotel._id.equals(demoIds[index]));
    if (index < 30) assert(old, `Existing browse listing missing: ${source.name}`);
    if (old) {
      assert.equal(old.name, source.name);
      assert.equal(old.isDemoCatalog, true, 'ID collision with bookable listing');
    }
  }
  assert(total === 50 || total === 100, 'Unexpected hotel count; inspect manually');
  assert.equal(existing.length, total - 20);
  assert.equal(new Set(base.map(h => String(h.ownerId))).size, 1, 'Expected original catalog owner');
  const ownerId = base[0].ownerId;
  const plan = {
    version: catalog.version, database: db.databaseName, existingHotels: total,
    create: 80 - existing.length, updateEditorialRatings: 100,
    finalHotels: 100, bookableListingsUnchanged: true, verifiedReviewsUnchanged: true,
  };
  if (!apply) { console.log(JSON.stringify({ status: 'dry-run', ...plan }, null, 2)); return; }

  const backupDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backupPath = path.join(backupDir, `explore-100-before-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath, mongoose.mongo.BSON.EJSON.stringify({ database: db.databaseName, hotels: [...base, ...existing] }, null, 2, { relaxed: false }), { flag: 'wx', mode: 0o600 });
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [index, source] of baseCatalog.hotels.entries()) {
        const result = await hotels.updateOne({ _id: baseIds[index], name: source.fields.name },
          { $set: editorialData(source.fields.name, source.fields.city, index) }, { session });
        assert.equal(result.matchedCount, 1);
      }
      for (const [index, source] of catalog.hotels.entries()) {
        const id = demoIds[index];
        const preview = editorialData(source.name, source.city, index + 20);
        if (index < 30 || existing.some(hotel => hotel._id.equals(id))) {
          const result = await hotels.updateOne({ _id: id, name: source.name, isDemoCatalog: true },
            { $set: preview }, { session });
          assert.equal(result.matchedCount, 1);
          continue;
        }
        const provenance = {
          migration: catalog.version, sources: [source.source], sourceLocationId: source.sourceLocationId,
          scope: 'Historical public listing name and coordinates only; no verified room inventory, rates, property photos or Hotelia guest reviews.',
          ratingSource: 'editorial UI demonstration; separate from verified guest reviews',
        };
        const result = await hotels.insertOne({
          _id: id, name: source.name, description: `Khách sạn tại ${source.city}. Thông tin phòng, giá và ảnh khách sạn đang được cập nhật trên Hotelia.`,
          address: source.city, city: source.city, country: 'Việt Nam',
          latitude: source.latitude, longitude: source.longitude,
          ownerId, status: 'PUBLISHED', starRating: 0,
          averageRating: 0, reviewCount: 0, amenities: [], images: [], isDemoCatalog: true,
          ...preview, dataProvenance: provenance, createdAt: now, updatedAt: now,
        }, { session });
        assert(result.insertedId.equals(id));
      }
      assert.equal(await hotels.countDocuments({}, { session }), 100);
      const docs = await hotels.find({ _id: { $in: [...baseIds, ...demoIds] } }, { session }).toArray();
      assert.equal(docs.length, 100);
      for (const doc of docs) {
        assert(doc.demoReviewCount >= 10 && doc.demoReviewCount <= 50);
        assert.equal(doc.demoReviews.length, doc.demoReviewCount);
        const average = doc.demoReviews.reduce((sum, review) => sum + review.rating, 0) / doc.demoReviewCount;
        assert.equal(doc.demoRating, Number(average.toFixed(1)));
      }
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  console.log(JSON.stringify({ status: 'committed', ...plan, backupPath }, null, 2));
}

run().catch(error => {
  console.error('Catalog expansion failed:', error.name, error.code || '', error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
