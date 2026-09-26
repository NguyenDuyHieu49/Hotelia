/* Scoped media migration: dry run by default; preserves prices, stock and bookings. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { EJSON } = mongoose.mongo.BSON;
const catalog = require('../data/verified-media.v1.json');
const args = process.argv.slice(2);
assert(args.every(x => x === '--apply'), 'Only --apply is supported');
const hash = value => crypto.createHash('sha256').update(EJSON.stringify(value, {relaxed:false})).digest('hex');
const oid = id => new mongoose.Types.ObjectId(id);
const safe = condition => assert(condition, 'Precondition or invariant failed; transaction not committed');
const root = path.resolve(__dirname, '..');
const unchanged = (doc, fields) => Object.fromEntries(Object.entries(doc).filter(([k]) => !fields.includes(k)));
async function run() {
  const entries = catalog.hotels.flatMap(h => [h, ...h.rooms]);
  safe(catalog.hotels.length === 20 && entries.length === 80 && new Set(entries.map(e=>e.id)).size === 80);
  for (const e of entries) {
    safe(e.localPath === `/media/hotels/${e.id}.jpg` && e.source.startsWith('https://') && e.image.startsWith('https://'));
    safe(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public',e.localPath))).digest('hex') === e.sha256);
  }
  const env = dotenv.parse(fs.readFileSync(path.join(root,'.env')));
  await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
  const db = mongoose.connection.db;
  safe(db.databaseName === 'test');
  const hotelIds = catalog.hotels.map(h=>oid(h.id));
  const roomIds = catalog.hotels.flatMap(h=>h.rooms.map(r=>oid(r.id)));
  const filters = {hotels:{_id:{$in:hotelIds}},roomtypes:{hotelId:{$in:hotelIds}},
    bookings:{hotelId:{$in:hotelIds}},roomavailabilities:{roomTypeId:{$in:roomIds}},reviews:{hotelId:{$in:hotelIds}}};
  const read = async session => {
    const result = {};
    for (const [name,filter] of Object.entries(filters)) result[name] = await db.collection(name).find(filter,{session}).sort({_id:1}).toArray();
    return result;
  };
  const before = await read();
  safe(before.hotels.length === 20 && before.roomtypes.length === 60);
  const matches = (doc,e) => doc.mediaProvenance?.version === catalog.version && hash(doc.images) === hash([e.localPath]);
  if (catalog.hotels.every(h=>matches(before.hotels.find(d=>String(d._id)===h.id),h) && h.rooms.every(r=>{
    const d=before.roomtypes.find(d=>String(d._id)===r.id); return d && matches(d,r) && d.name===r.name;
  }))) { console.log('Already applied: 20 hotels, 60 rooms.'); return; }
  for (const h of catalog.hotels) {
    const old = before.hotels.find(d=>String(d._id)===h.id);
    safe(old?.name === h.name && !old.mediaProvenance);
    for (const r of h.rooms) {
      const room = before.roomtypes.find(d=>String(d._id)===r.id);
      safe(room?.name === r.expectedName && String(room.hotelId) === h.id && !room.mediaProvenance);
    }
  }
  if (!args.includes('--apply')) {console.log('Dry run passed: 80 local images verified; update 20 hotels and 60 room names/photos.');return;}
  const backupDir = path.join(root,'backups');
  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  const backupPath = path.join(backupDir,`media-before-${Date.now()}.ejson`);
  fs.writeFileSync(backupPath,EJSON.stringify({version:catalog.version,hotels:before.hotels,roomtypes:before.roomtypes},null,2,{relaxed:false}),{mode:0o600,flag:'wx'});
  const provenance = e => ({version:catalog.version,verifiedAt:'2026-09-25',source:e.source,originalImage:e.image,sha256:e.sha256,
    scope:'Official property photo and room/gallery name only; rates, capacity, amenities and inventory remain demo data'});
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async()=>{
      safe(hash(await read(session)) === hash(before));
      for (const h of catalog.hotels) {
        const old = before.hotels.find(d=>String(d._id)===h.id);
        const result = await db.collection('hotels').updateOne({_id:oid(h.id)},{$set:{images:[h.localPath],mediaProvenance:provenance(h),
          'dataProvenance.unknownFields':(old.dataProvenance?.unknownFields || []).filter(f=>f!=='images')}},{session});
        safe(result.matchedCount === 1);
        for (const r of h.rooms) {
          const result = await db.collection('roomtypes').updateOne({_id:oid(r.id),hotelId:oid(h.id)},{$set:{name:r.name,images:[r.localPath],
            description:`${r.name} — ${h.name}. Ảnh từ website chính thức. Giá, sức chứa, tiện nghi và số phòng trong bản demo chỉ mang tính minh họa.`,mediaProvenance:provenance(r)}},{session});
          safe(result.matchedCount === 1);
        }
      }
      const after = await read(session);
      for(const name of ['bookings','roomavailabilities','reviews']) safe(hash(before[name])===hash(after[name]));
      for(const name of ['hotels','roomtypes']) {
        const allowed = name==='hotels' ? ['images','mediaProvenance','dataProvenance'] : ['name','description','images','mediaProvenance'];
        safe(before[name].length===after[name].length);
        for(let i=0;i<before[name].length;i++) safe(hash(unchanged(before[name][i],allowed))===hash(unchanged(after[name][i],allowed)));
      }
      for(const h of catalog.hotels) {
        safe(matches(after.hotels.find(d=>String(d._id)===h.id),h));
        for(const r of h.rooms) {const d=after.roomtypes.find(d=>String(d._id)===r.id);safe(matches(d,r) && d.name===r.name);}
      }
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
  } finally {await session.endSession();}
  console.log(JSON.stringify({status:'committed',hotels:20,rooms:60,backupPath,preserved:['IDs','prices','capacity','stock','bookings','reviews']},null,2));
}
run().catch(e=>{console.error(e instanceof assert.AssertionError ? e.message : `Migration failed (${e.name}); connection details suppressed`);process.exitCode=1;}).finally(()=>mongoose.disconnect());
