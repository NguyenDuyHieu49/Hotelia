import { useEffect, useState } from 'react';
import api, { userApi } from '../lib/api/client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/auth/AuthContext';
export function SettingsPage() {
  const {logout,refreshUser}=useAuth();
  const [name,setName]=useState(''),[phone,setPhone]=useState(''),[current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const errorText=(e:any)=>String(e.response?.data?.message || 'Không thể cập nhật');
  useEffect(()=>{userApi.getMe().then(r=>{setName(r.data.name);setPhone(r.data.phone || '');}).catch(e=>setMessage(errorText(e)));},[]);
  const field='border rounded p-2 block w-full mt-1';
  return <div className="max-w-xl space-y-6"><h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>{message && <p role="status">{message}</p>}
    <form className="bg-white p-6 rounded space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try {await userApi.updateMe({name,phone});await refreshUser();setMessage('Đã lưu hồ sơ');} catch(e){setMessage(errorText(e));} finally {setBusy(false);}}}>
      <label className="block">Họ tên<input required minLength={2} className={field} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block">Điện thoại<input className={field} value={phone} onChange={e=>setPhone(e.target.value)}/></label><Button loading={busy}>Lưu hồ sơ</Button>
    </form>
    <form className="bg-white p-6 rounded space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);try {await api.post('/account/password',{currentPassword:current,newPassword:password});logout();} catch(e){setMessage(errorText(e));} finally {setBusy(false);}}}>
      <h2 className="font-bold">Đổi mật khẩu</h2>
      <label className="block">Mật khẩu hiện tại<input type="password" required className={field} value={current} onChange={e=>setCurrent(e.target.value)}/></label>
      <label className="block">Mật khẩu mới<input type="password" required minLength={8} maxLength={72} className={field} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label className="block">Nhập lại mật khẩu mới<input type="password" required className={field} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <Button loading={busy} disabled={password!==confirm || password===current}>Đổi mật khẩu và đăng nhập lại</Button>
    </form>
  </div>;
}
