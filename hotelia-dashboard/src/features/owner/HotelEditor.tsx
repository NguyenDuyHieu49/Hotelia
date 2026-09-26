import { useEffect, useState } from 'react';
import { hotelApi, roomTypeApi } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import type { Hotel, RoomType } from '../../types';

export function HotelEditor({ hotel, readOnly = false, onClose }: { hotel?: Hotel; readOnly?: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState(hotel);
  const [name, setName] = useState(hotel?.name || '');
  const [description, setDescription] = useState(hotel?.description || '');
  const [address, setAddress] = useState(hotel?.address || '');
  const [city, setCity] = useState(hotel?.city || 'Hà Nội');
  const [stars, setStars] = useState(hotel?.starRating || 1);
  const [images, setImages] = useState(hotel?.images?.join('\n') || '');
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [editingRoom, setEditingRoom] = useState<Partial<RoomType> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const errorText = (e: any) => String(e.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.');
  useEffect(() => { if (current) roomTypeApi.getByHotel(current.id).then(r => setRooms(r.data)).catch(e => setMessage(errorText(e))); }, [current?.id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    const body = { name, description, address, city, starRating: stars, images: images.split('\n').map(s => s.trim()).filter(Boolean) };
    try { const r = current ? await hotelApi.updateHotel(current.id, body) : await hotelApi.createHotel(body); setCurrent(r.data); setMessage('Đã lưu khách sạn'); }
    catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
  };
  const saveRoom = async (event: React.FormEvent) => {
    event.preventDefault(); if (!current || !editingRoom) return; setBusy(true);
    const body = { name: editingRoom.name, description: editingRoom.description || '', basePrice: Number(editingRoom.basePrice), maxGuests: Number(editingRoom.maxGuests), totalRooms: Number(editingRoom.totalRooms), images: editingRoom.images || [] };
    try {
      if (editingRoom.id) await roomTypeApi.update(editingRoom.id, body); else await roomTypeApi.create(current.id, body);
      setRooms((await roomTypeApi.getByHotel(current.id)).data); setEditingRoom(null); setMessage('Đã lưu loại phòng');
    } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
  };
  const field = 'block w-full border rounded p-2 mt-1';
  return <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-6" role="dialog" aria-modal="true" aria-label="Thông tin khách sạn">
    <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 space-y-5">
      <div className="flex justify-between"><h2 className="text-xl font-bold">{readOnly ? 'Chi tiết khách sạn' : current ? 'Sửa khách sạn' : 'Thêm khách sạn'}</h2><Button onClick={onClose} disabled={busy}>Đóng</Button></div>
      {message && <p role="status" className="bg-blue-50 p-3 rounded">{message}</p>}
      <form onSubmit={save} className="space-y-3">
        <fieldset disabled={readOnly || busy} className="space-y-3">
          <label className="block">Tên khách sạn<input className={field} required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="block">Mô tả<textarea className={field} required minLength={10} value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className="block">Địa chỉ<input className={field} required value={address} onChange={e => setAddress(e.target.value)} /></label>
          <label className="block">Thành phố<input className={field} required value={city} onChange={e => setCity(e.target.value)} /></label>
          <label className="block">Hạng sao<input className={field} type="number" min={1} max={5} value={stars} onChange={e => setStars(Number(e.target.value))} /></label>
          <label className="block">URL ảnh, mỗi dòng một ảnh<textarea className={field} value={images} onChange={e => setImages(e.target.value)} /></label>
          {!readOnly && <Button type="submit" loading={busy}>Lưu khách sạn</Button>}
        </fieldset>
      </form>
      {current && !readOnly && ['DRAFT', 'REJECTED'].includes(current.status) && <Button disabled={busy} onClick={async () => {
        setBusy(true); try { setCurrent((await hotelApi.submitHotel(current.id)).data); setMessage('Đã gửi yêu cầu duyệt'); } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
      }}>Gửi duyệt khách sạn</Button>}
      {current && <section className="space-y-3 border-t pt-4">
        <h3 className="font-semibold">Loại phòng</h3>
        {rooms.length === 0 && <p>Chưa có loại phòng.</p>}
        {rooms.map(room => <div key={room.id} className="border p-3 rounded flex gap-4 items-center">
          {room.images?.[0] && <img src={room.images[0]} alt={room.name} className="w-24 h-20 object-cover rounded" />}
          <div className="flex-1"><b>{room.name}</b><p>{room.basePrice.toLocaleString('vi-VN')}đ/đêm · {room.maxGuests} khách · {room.totalRooms} phòng</p></div>
          {!readOnly && <Button onClick={() => setEditingRoom(room)}>Sửa</Button>}
          {!readOnly && <Button variant="danger" disabled={busy} onClick={async () => {
            if (!confirm('Ngừng bán loại phòng này? Booking hiện có được giữ lại.')) return;
            setBusy(true); try { await roomTypeApi.delete(room.id); setRooms(rooms.filter(r => r.id !== room.id)); } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
          }}>Ngừng bán</Button>}
        </div>)}
        {!readOnly && <Button onClick={() => setEditingRoom({ name: '', description: '', basePrice: 500000, maxGuests: 2, totalRooms: 1, images: [] })}>Thêm loại phòng</Button>}
        {editingRoom && !readOnly && <form onSubmit={saveRoom} className="border p-4 space-y-3 rounded">
          <label className="block">Tên loại phòng<input className={field} required value={editingRoom.name || ''} onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })} /></label>
          <label className="block">Mô tả<textarea className={field} required value={editingRoom.description || ''} onChange={e => setEditingRoom({ ...editingRoom, description: e.target.value })} /></label>
          {(['basePrice', 'maxGuests', 'totalRooms'] as const).map((key, i) => <label className="block" key={key}>{['Giá mỗi đêm (VND)', 'Sức chứa', 'Số phòng'][i]}<input className={field} required type="number" min={1} value={editingRoom[key] || 1} onChange={e => setEditingRoom({ ...editingRoom, [key]: Number(e.target.value) })} /></label>)}
          <label className="block">URL ảnh phòng<textarea className={field} value={editingRoom.images?.join('\n') || ''} onChange={e => setEditingRoom({ ...editingRoom, images: e.target.value.split('\n').filter(Boolean) })} /></label>
          <Button type="submit" loading={busy}>Lưu loại phòng</Button> <Button type="button" onClick={() => setEditingRoom(null)}>Bỏ qua</Button>
        </form>}
      </section>}
    </div>
  </div>;
}
