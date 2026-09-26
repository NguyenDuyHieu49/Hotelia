import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi, ownerApi, bookingApi } from '../lib/api/client';
import type { Booking } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function DashboardSummary({ owner }: { owner: boolean }) {
  const [stats,setStats]=useState<Record<string,number>>({});
  const [bookings,setBookings]=useState<Booking[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=async()=>{setLoading(true);try {
    const [s,b]=await Promise.all([owner?ownerApi.getDashboard():adminApi.getStats(),owner?bookingApi.getOwnerBookings():bookingApi.getAdminBookings()]);
    setStats(owner?s.data.stats:s.data);setBookings(b.data);setError('');
  } catch {setError('Không thể tải thống kê. Vui lòng thử lại.');} finally {setLoading(false);}};
  useEffect(()=>{load();},[owner]);
  const year=new Date().getFullYear();
  const confirmed=['PAID','CONFIRMED','CHECKED_IN','CHECKED_OUT','COMPLETED'];
  const chart=Array.from({length:12},(_,i)=>({month:`T${i+1}`,value:bookings.filter(b=>{const d=new Date(b.createdAt);return d.getFullYear()===year && d.getMonth()===i && confirmed.includes(b.status);}).reduce((a,b)=>a+b.totalPrice,0)}));
  const cards=owner?[['Khách sạn',stats.totalHotels],['Khách sạn đã đăng',stats.publishedHotels],['Đơn đặt phòng',stats.totalBookings],['Đang có khách lưu trú',bookings.filter(b=>b.status==='CHECKED_IN').length]]:[['Người dùng',stats.users],['Chủ khách sạn',stats.owners],['Khách sạn đã đăng',stats.hotels],['Đơn đặt phòng',stats.bookings]];
  return <div className="space-y-6"><div className="flex justify-between"><h1 className="text-2xl font-bold">Tổng quan {owner?'khách sạn':'hệ thống'}</h1><Button onClick={load} loading={loading}>Làm mới</Button></div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!loading && !error && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label,value])=><Card key={label}><p>{label}</p><b className="text-3xl">{value ?? 0}</b></Card>)}</div>
      <Card><h2 className="font-bold">Giá trị đặt phòng được xác nhận trong năm {year}</h2><p className="text-sm text-gray-500">Tính theo ngày tạo booking; bao gồm đơn thanh toán tại khách sạn, không đồng nghĩa tiền đã thu.</p>
        <div className="h-64 mt-5"><ResponsiveContainer><BarChart data={chart}><XAxis dataKey="month"/><YAxis/><Tooltip formatter={(v:number)=>`${v.toLocaleString('vi-VN')}đ`}/><Bar dataKey="value" fill="#2563eb" name="Giá trị booking"/></BarChart></ResponsiveContainer></div>
      </Card>
      <Card><div className="flex justify-between"><h2 className="font-bold">Đặt phòng gần đây</h2><Link className="text-blue-600" to={owner?'/owner/bookings':'/admin/bookings'}>Xem tất cả</Link></div>
        {bookings.length===0 && <p className="mt-4">Chưa có đặt phòng.</p>}
        {bookings.slice(0,5).map(b=><div key={b.id} className="py-3 border-b flex justify-between"><span>{b.guestName} · {new Date(b.checkIn).toLocaleDateString('vi-VN')}</span><span>{b.totalPrice.toLocaleString('vi-VN')}đ · {b.status}</span></div>)}
      </Card>
    </>}
  </div>;
}
