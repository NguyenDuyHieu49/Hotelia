import { BadRequestException } from '@nestjs/common';

export const DAY = 86400000;
export function stayDates(start:string,end:string,now=new Date()) {
  const parse=(value:string)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày phải có dạng YYYY-MM-DD');
    const date=new Date(value+'T00:00:00.000Z');
    if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) throw new BadRequestException('Ngày không hợp lệ');
    return date;
  };
  const checkIn=parse(start),checkOut=parse(end);
  const today=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
  const nights=(+checkOut-+checkIn)/DAY;
  if(start<today) throw new BadRequestException('Ngày nhận phòng không được ở quá khứ');
  if(nights<1 || nights>90) throw new BadRequestException('Thời gian lưu trú phải từ 1 đến 90 đêm');
  return {checkIn,checkOut,nights};
}
export function occupyingBookings(now=new Date()) {
  return {$or:[{status:{$in:['PAID','CONFIRMED','CHECKED_IN','CANCEL_REQUESTED']}},
    {status:'PENDING_PAYMENT',holdExpiresAt:{$gt:now}},
    {status:'PENDING_PAYMENT',holdExpiresAt:{$exists:false},createdAt:{$gt:new Date(+now-15*60000)}}]};
}
export function expiredHold(now=new Date()) {
  return {$or:[{holdExpiresAt:{$lte:now}},
    {holdExpiresAt:{$exists:false},createdAt:{$lte:new Date(+now-15*60000)}}]};
}
export function freeRooms(total:number,start:Date,end:Date,bookings:{checkIn:Date;checkOut:Date}[]) {
  let free=total;
  for(let day=+start;day<+end;day+=DAY) {
    free=Math.min(free,total-bookings.filter(b=>+new Date(b.checkIn)<day+DAY && +new Date(b.checkOut)>day).length);
  }
  return Math.max(0,free);
}
