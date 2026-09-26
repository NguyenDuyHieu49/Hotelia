/* Scoped catalog migration. Dry run by default; never runs seed/drop/delete. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { EJSON } = mongoose.mongo.BSON;
const catalog = require('../data/real-hotels.v1.json');
const args = process.argv.slice(2);
assert(args.every(x => x === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const backupDir = path.resolve(__dirname, '../backups');
const hash = x => crypto.createHash('sha256').update(EJSON.stringify(x, { relaxed: false })).digest('hex');
const safe = condition => assert(condition, 'Database precondition or verification failed; no transaction committed');
const ids = catalog.hotels.map(h => new mongoose.Types.ObjectId(h.id));
const mutable = new Set(['name','description','address','city','country','district','latitude','longitude','starRating','amenities','images','checkInTime','checkOutTime','averageRating','reviewCount','dataProvenance','updatedAt']);
const untouched = d => Object.fromEntries(Object.entries(d).filter(([k]) => !mutable.has(k)));
async function run() {
  safe(ids.length === 20 && new Set(catalog.hotels.map(h => h.id)).size === 20);
  for (const h of catalog.hotels) {
    safe(h.sources.length > 0 && h.fields.name && h.fields.address && h.fields.city);
    safe(h.fields.starRating >= 0 && h.fields.starRating <= 5);
    safe(Object.keys(h.fields).every(k => mutable.has(k)));
    safe(h.fields.images.every(u => u.startsWith('https://') && !u.includes('picsum')));
  }
  const envPath = path.resolve(__dirname, '../.env');
  const env = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};
  await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  safe(db.databaseName === 'test');
  const hotels = db.collection('hotels');
  const before = await hotels.find({_id: {$in: ids}}).sort({_id:1}).toArray();
  safe(before.length === 20);
  if (before.every(h => h.dataProvenance?.migration === catalog.version)) {
    console.log(JSON.stringify({status:'already-applied',count:20}));
    return;
  }
  for (const h of catalog.hotels) {
    const old = before.find(d => d._id.toString() === h.id);
    safe(old.name === h.expectedName && old.city === h.fields.city);
  }
  const roomIds = (await db.collection('roomtypes').find({hotelId:{$in:ids}},{projection:{_id:1}}).toArray()).map(r=>r._id);
  const relatedFilter = name => name === 'roomavailabilities' ? {roomTypeId:{$in:roomIds}} : {hotelId:{$in:ids}};
  const related = {};
  // Fingerprint full related documents but never print or back up user content.
  for (const name of ['roomtypes','roomavailabilities','bookings','reviews']) {
    const docs = await db.collection(name).find(relatedFilter(name)).sort({_id:1}).toArray();
    related[name] = { count: docs.length, hash: hash(docs) };
  }
  const plan = {version:catalog.version,database:db.databaseName,count:20,related,
    officialImages:catalog.hotels.filter(h=>h.fields.images.length).length,
    verifiedCoordinates:catalog.hotels.filter(h=>h.fields.latitude !== undefined).length};
  if (!apply) { console.log(JSON.stringify({status:'dry-run',...plan},null,2)); return; }
  fs.mkdirSync(backupDir, {recursive:true,mode:0o700});
  const backupPath = path.join(backupDir,`hotels-before-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath,EJSON.stringify({database:db.databaseName,version:catalog.version,createdAt:new Date(),hotels:before},null,2,{relaxed:false}),{mode:0o600,flag:'wx'});
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const fresh = await hotels.find({_id:{$in:ids}},{session}).sort({_id:1}).toArray();
      safe(hash(fresh) === hash(before));
      const stats = await db.collection('reviews').aggregate([
        {$match:{hotelId:{$in:ids},isVisible:{$ne:false},rating:{$gte:1,$lte:5}}},
        {$group:{_id:'$hotelId',averageRating:{$avg:'$rating'},reviewCount:{$sum:1}}}
      ],{session}).toArray();
      const operations = catalog.hotels.map(h => {
        const review = stats.find(r=>r._id.toString() === h.id);
        const set = {...h.fields,averageRating:review?.averageRating || 0,reviewCount:review?.reviewCount || 0,updatedAt:new Date(),
          dataProvenance:{migration:catalog.version,verifiedAt:catalog.verifiedAt,sources:h.sources,
            scope:'public-hotel-catalog; application rooms, inventory, rates, ownership and reviews are demo data',
            unknownFields:[...(!h.fields.images.length?['images']:[]),...(!h.fields.latitude?['latitude','longitude']:[]),...(!h.fields.starRating?['starRating']:[]),...(!h.fields.checkInTime?['checkInTime','checkOutTime']:[])],
            amenitiesScope:'confirmed subset',ratingSource:'visible in-app reviews; not an external hotel score'}};
        const unset = {district:''};
        if (h.fields.latitude === undefined) {unset.latitude='';unset.longitude='';}
        return {updateOne:{filter:{_id:new mongoose.Types.ObjectId(h.id),name:h.expectedName,city:h.fields.city},update:{$set:set,$unset:unset}}};
      });
      result = await hotels.bulkWrite(operations,{session,ordered:true});
      safe(result.matchedCount === 20 && result.modifiedCount === 20);
      const after = await hotels.find({_id:{$in:ids}},{session}).sort({_id:1}).toArray();
      safe(after.length === 20);
      for (let i=0;i<20;i++) {
        safe(hash(untouched(before[i])) === hash(untouched(after[i])));
        const h = catalog.hotels.find(h=>h.id === after[i]._id.toString());
        for (const [k,v] of Object.entries(h.fields)) safe(hash(after[i][k]) === hash(v));
        safe(!('district' in after[i]));
        if(h.fields.latitude === undefined) safe(!('latitude' in after[i]) && !('longitude' in after[i]));
      }
      for (const name of Object.keys(related)) {
        const docs = await db.collection(name).find(relatedFilter(name),{session}).sort({_id:1}).toArray();
        safe(hash(docs) === related[name].hash);
      }
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
  } finally { await session.endSession(); }
  const confirmed = await hotels.countDocuments({_id:{$in:ids},'dataProvenance.migration':catalog.version});
  safe(confirmed === 20);
  const report = {status:'committed',...plan,matched:result.matchedCount,modified:result.modifiedCount,confirmed,backupPath,finishedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(backupDir,'last-real-hotels-result.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error('Migration failed:',e.name,e.code || '',e instanceof assert.AssertionError ? e.message : 'See database connectivity/permissions; connection details suppressed');process.exitCode=1;}).finally(()=>mongoose.disconnect());
