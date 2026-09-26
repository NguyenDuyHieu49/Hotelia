import { useEffect, useState } from 'react';
import api from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
type RecordItem={id:string;createdAt?:string;method?:string;path?:string;actorId?:string;amount?:number;status?:string;content?:string;rating?:number;isVisible?:boolean;hotelId?:string};
export function AdminRecords({ kind }:{kind:'payments'|'reviews'|'audit-logs'}) {
  const [items,setItems]=useState<RecordItem[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=async()=>{setBusy(true);try {setItems((await api.get(`/admin/${kind}`)).data);setError('');} catch {setError('Không thể tải dữ liệu');} finally {setBusy(false);}};
  useEffect(()=>{load();},[kind]);
  return <div className="space-y-4"><div className="flex justify-between"><h1 className="text-2xl font-bold">{{payments:'Thanh toán',reviews:'Đánh giá','audit-logs':'Nhật ký thao tác'}[kind]}</h1><Button onClick={load} loading={busy}>Làm mới</Button></div>
    {error && <p role="alert">{error}</p>}
    {kind==='payments' && <p>Thanh toán trực tuyến chưa được cấu hình. Đơn thanh toán tại khách sạn chỉ là xác nhận booking, không phải giao dịch đã thu tiền.</p>}
    {kind==='audit-logs' && <p>Hiển thị tối đa 200 thao tác mới nhất kể từ khi bật nhật ký. Không ghi mật khẩu hoặc nội dung yêu cầu.</p>}
    {!busy && !items.length && <p>Chưa có dữ liệu.</p>}
    {items.map(item=><article key={item.id} className="bg-white rounded p-5 space-y-2">
      <p className="text-gray-500 text-sm">{item.createdAt?new Date(item.createdAt).toLocaleString('vi-VN'):item.id}</p>
      {kind==='reviews' ? <><b>{item.rating}/5</b><p>{item.content}</p><Button disabled={busy || !item.isVisible} onClick={async()=>{if(!confirm('Ẩn đánh giá này và cập nhật lại điểm khách sạn?'))return;setBusy(true);try {await api.post(`/reviews/${item.id}/hide`);await load();} catch {setError('Không thể ẩn đánh giá');} finally {setBusy(false);}}}>{item.isVisible?'Ẩn đánh giá':'Đã ẩn'}</Button></> : kind==='payments' ? <p>{item.amount?.toLocaleString('vi-VN')}đ · {item.status} · {item.method}</p> : <p>{item.method} {item.path} · Tài khoản {item.actorId}</p>}
    </article>)}
  </div>;
}
