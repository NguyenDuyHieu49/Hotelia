/* Scoped, idempotent Explore demo migration. Dry run unless --apply is passed. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const catalog = require('../data/explore-hotels.v1.json');
const baseCatalog = require('../data/real-hotels.v1.json');
const args = process.argv.slice(2);
assert(args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const objectId = name => new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`hotelia-explore-v1:${name}`).digest('hex').slice(0, 24));
const demo = (name, index) => {
  const rating = Number((4.1 + ((index * 7) % 9) / 10).toFixed(1));
  const count = 18 + ((index * 23) % 163);
  const samples = [
    'Nhận xét mẫu: vị trí thuận tiện cho lịch trình tham quan.',
    'Nhận xét mẫu: không gian lưu trú phù hợp cho chuyến nghỉ ngắn.',
    'Nhận xét mẫu: có thể cân nhắc cho kỳ nghỉ cùng gia đình.',
    'Nhận xét mẫu: điểm dừng chân đáng tham khảo khi khám phá thành phố.'
  ];
  return {demoRating: rating, demoReviewCount: count,
    demoReviews: [{rating, content: samples[index % samples.length]},
      {rating: Math.max(4, Number((rating - 0.2).toFixed(1))), content: samples[(index + 1) % samples.length]}]};
};
async function run() {
  assert.equal(catalog.hotels.length, 30);
  assert.equal(baseCatalog.hotels.length, 20);
  const names = [...baseCatalog.hotels.map(h => h.fields.name), ...catalog.hotels.map(h => h[0])];
  assert.equal(new Set(names.map(n => n.toLocaleLowerCase())).size, 50, 'Duplicate hotel name');
  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, {serverSelectionTimeoutMS: 10000});
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, 'test', 'Unexpected database');
  const hotels = db.collection('hotels');
  const baseIds = baseCatalog.hotels.map(h => new mongoose.Types.ObjectId(h.id));
  const base = await hotels.find({_id: {$in: baseIds}}).toArray();
  assert.equal(base.length, 20, 'Expected the 20 verified catalog hotels');
  for (const hotel of baseCatalog.hotels) {
    assert.equal(base.find(doc => doc._id.toString() === hotel.id)?.name, hotel.fields.name);
  }
  const owners = new Set(base.map(h => h.ownerId?.toString()));
  assert.equal(owners.size, 1, 'Expected one existing demo owner');
  const ownerId = base[0].ownerId;
  const newIds = catalog.hotels.map(h => objectId(h[0]));
  const existing = await hotels.find({_id: {$in: newIds}}).toArray();
  for (const doc of existing) {
    assert.equal(doc.isDemoCatalog, true, 'ID collision with a real listing');
    assert.equal(doc.name, catalog.hotels.find(h => objectId(h[0]).equals(doc._id))?.[0]);
  }
  const overallCount = await hotels.countDocuments();
  assert(overallCount === 20 || overallCount === 50, 'Unexpected hotel count; inspect manually');
  const plan = {version: catalog.version, database: db.databaseName, existingHotels: overallCount,
    create: 30 - existing.length, updateDemoRankings: 50, finalHotels: 50,
    newListingsBookable: false, realReviewsModified: false};
  if (!apply) { console.log(JSON.stringify({status: 'dry-run', ...plan}, null, 2)); return; }
  const backupDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(backupDir, {recursive: true, mode: 0o700});
  const backupPath = path.join(backupDir, `explore-before-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath, mongoose.mongo.BSON.EJSON.stringify({base, existing}, null, 2, {relaxed: false}), {flag:'wx',mode:0o600});
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (let index = 0; index < baseCatalog.hotels.length; index++) {
        const h = baseCatalog.hotels[index];
        const result = await hotels.updateOne({_id: new mongoose.Types.ObjectId(h.id),name: h.fields.name},
          {$set: demo(h.fields.name,index)}, {session});
        assert.equal(result.matchedCount, 1);
      }
      for (let index = 0; index < catalog.hotels.length; index++) {
        const [name,city,propertySource] = catalog.hotels[index];
        const id = newIds[index];
        const source = propertySource || catalog.operatorSource;
        const result = await hotels.updateOne({_id:id,isDemoCatalog:true}, {$set:demo(name,index+20),$setOnInsert:{
          _id:id,name,description:`Khách sạn tại ${city}. Thông tin phòng, giá và ảnh khách sạn chưa được xác minh trên Hotelia.`,
          address:city,city,country:'Việt Nam',ownerId,status:'PUBLISHED',starRating:0,
          averageRating:0,reviewCount:0,amenities:[],images:[],isDemoCatalog:true,
          dataProvenance:{migration:catalog.version,verifiedAt:catalog.verifiedAt,sources:[source],
            scope:'Verified public hotel name and destination only. No verified room inventory, rates, property photos or guest reviews.'},
          createdAt:now,updatedAt:now
        }}, {upsert:true,session});
        assert(result.upsertedCount === 1 || result.matchedCount === 1);
      }
      assert.equal(await hotels.countDocuments({}, {session}), 50);
    }, {readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
  } finally { await session.endSession(); }
  console.log(JSON.stringify({status:'committed',...plan,backupPath},null,2));
}
run().catch(error => {console.error('Explore migration failed:', error.name, error.code || '', error.message); process.exitCode=1;})
  .finally(() => mongoose.disconnect());
