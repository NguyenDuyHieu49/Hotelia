const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const catalog = require('../data/verified-media.v1.json');
const base = (process.env.DEMO_API_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/,'');
async function json(route) {
  const res=await fetch(base+route,{signal:AbortSignal.timeout(15000)});
  assert.equal(res.status,200);return res.json();
}
async function run() {
  let unrated=0, rooms=0, images=0;
  for(const expected of catalog.hotels) {
    const h=await json(`/hotels/${expected.id}`);
    assert.deepEqual(h.images,[expected.localPath]);
    if(!h.reviewCount) {assert.equal(h.averageRating,0);unrated++;}
    const actualRooms=await json(`/room-types/hotel/${expected.id}`);
    assert.equal(actualRooms.length,3);
    for(const r of expected.rooms) {
      const actual=actualRooms.find(a=>a._id===r.id);
      assert.equal(actual?.name,r.name);assert.deepEqual(actual.images,[r.localPath]);rooms++;
    }
    for(const e of [expected,...expected.rooms]) {
      const res=await fetch(new URL(e.localPath,base),{signal:AbortSignal.timeout(15000)});
      assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/^image\/jpeg/);
      assert.equal(createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex'),e.sha256);images++;
    }
  }
  console.log(JSON.stringify({hotels:catalog.hotels.length,rooms,verifiedImageResponses:images,unratedHotels:unrated,missingImages:0,placeholderImages:0},null,2));
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
