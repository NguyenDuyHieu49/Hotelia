import { useEffect, useState } from 'react';
import api from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
type Ticket = { id:string; subject:string; message:string; status:string; reply?:string };
export function AdminSupport() {
  const [items,setItems]=useState<Ticket[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const load=async()=>{try {setItems((await api.get('/account/support/all')).data);setError('');} catch {setError('Không thể tải yêu cầu hỗ trợ');}};
  useEffect(()=>{load();},[]);
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Yêu cầu hỗ trợ</h1><Button onClick={load}>Làm mới</Button>
    {error && <p role="alert">{error}</p>}{items.length===0 && <p>Chưa có yêu cầu hỗ trợ.</p>}
    {items.map(t=><article className="bg-white rounded p-5 space-y-3" key={t.id}><h2 className="font-bold">{t.subject}</h2><p className="whitespace-pre-wrap">{t.message}</p><p>{t.reply || 'Chưa phản hồi'}</p>
      <Button disabled={busy} onClick={async()=>{const reply=prompt('Nội dung phản hồi:',t.reply || '');if(!reply?.trim())return;setBusy(true);try {await api.post(`/account/support/${t.id}/reply`,{reply});await load();} catch {setError('Không thể gửi phản hồi');} finally {setBusy(false);}}}>Phản hồi</Button>
    </article>)}
  </div>;
}
