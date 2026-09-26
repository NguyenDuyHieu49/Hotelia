import { stayDates, freeRooms, occupyingBookings, expiredHold } from './booking-rules';

describe('booking calendar and inventory',()=>{
  const now=new Date('2026-09-25T06:00:00Z');
  it('allows today in Vietnam and prices calendar nights',()=>{
    expect(stayDates('2026-09-25','2026-09-27',now).nights).toBe(2);
  });
  it('rejects reversed, invalid, past and excessive stays',()=>{
    for(const [start,end] of [['2026-09-25','2026-09-25'],['2026-02-30','2026-03-02'],['2026-09-24','2026-09-26'],['2026-09-25','2027-09-25']]) expect(()=>stayDates(start,end,now)).toThrow();
  });
  it('counts each night separately and excludes checkout day',()=>{
    const date=(s:string)=>new Date(s+'T00:00:00Z');
    const bookings=[{checkIn:date('2026-09-25'),checkOut:date('2026-09-26')},{checkIn:date('2026-09-26'),checkOut:date('2026-09-27')}];
    expect(freeRooms(2,date('2026-09-25'),date('2026-09-27'),bookings)).toBe(1);
    expect(freeRooms(2,date('2026-09-27'),date('2026-09-28'),bookings)).toBe(2);
  });
  it('preserves confirmed rooms but ignores expired timed holds',()=>{
    const query=occupyingBookings(now);
    expect(query.$or[1]).toEqual({status:'PENDING_PAYMENT',holdExpiresAt:{$gt:now}});
    expect(query.$or[0]).toMatchObject({status:{$in:expect.arrayContaining(['CANCEL_REQUESTED'])}});
    expect(query.$or[2]).toEqual({status:'PENDING_PAYMENT',holdExpiresAt:{$exists:false},createdAt:{$gt:new Date(+now-15*60000)}});
    expect(expiredHold(now).$or[1]).toEqual({holdExpiresAt:{$exists:false},createdAt:{$lte:new Date(+now-15*60000)}});
  });
});
