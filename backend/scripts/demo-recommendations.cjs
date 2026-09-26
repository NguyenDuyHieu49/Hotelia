/* Two temporary guests; no authentication, real account history or bookings touched. */
const {randomUUID} = require('node:crypto');
const assert = require('node:assert/strict');
const base = (process.env.DEMO_API_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/,'');
const sessions = [randomUUID(),randomUUID()];
async function call(route,method='GET',body) {
  const response = await fetch(`${base}/recommendations${route}`,{method,headers:{'Content-Type':'application/json'},
    body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json();
}
const list = id => call(`?sessionId=${id}&limit=20`);
const top = result => result.hotels.slice(0,3).map(h=>`${h.name} (${h.city})`).join(' → ');
async function run() {
  try {
    const initial = await Promise.all(sessions.map(list));
    assert(initial.every(r=>!r.ranking.personalized));
    assert.deepEqual(initial[0].hotels.map(h=>h._id),initial[1].hotels.map(h=>h._id));
    console.log('Ban đầu, hai khách chưa có lịch sử: '+top(initial[0]));
    const scenarios = [
      {name:'Khách A — thích Đà Nẵng',hotel:'HAIAN Beach Hotel & Spa',city:'Đà Nẵng'},
      {name:'Khách B — thích Hà Nội',hotel:'Pan Pacific Hanoi',city:'Hà Nội'},
    ];
    for(let i=0;i<2;i++) {
      const chosen = initial[i].hotels.find(h=>h.name===scenarios[i].hotel);
      assert(chosen,`Missing demo hotel: ${scenarios[i].hotel}`);
      await call('/views','POST',{sessionId:sessions[i],hotelId:chosen._id});
      if(i===0) assert(!(await list(sessions[1])).ranking.personalized,'Guest history leaked');
    }
    for(let i=0;i<2;i++) {
      const result=await list(sessions[i]);
      assert(result.ranking.personalized && result.ranking.signalCount===1);
      assert.equal(result.hotels[0].city,scenarios[i].city);
      console.log(scenarios[i].name+': '+top(result));
    }
    console.log('PASS: cùng danh sách, không lọc điểm đến; đề xuất khác nhau theo lịch sử riêng.');
  } finally {
    const cleanup = await Promise.allSettled(sessions.map(id=>call(`/views?sessionId=${id}`,'DELETE')));
    if(cleanup.some(r=>r.status==='rejected')) throw new Error('Could not clean temporary sessions: '+sessions.join(', '));
    assert((await Promise.all(sessions.map(list))).every(r=>!r.ranking.personalized));
    console.log('Đã xóa lịch sử của hai phiên demo.');
  }
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
