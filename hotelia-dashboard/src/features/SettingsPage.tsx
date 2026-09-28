import { useEffect, useState, type FormEvent } from 'react';
import api, { userApi } from '../lib/api/client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/auth/AuthContext';

function errorText(error: unknown): string {
  const response = error as { response?: { data?: { message?: string | string[] } } };
  const message = response.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || 'Không thể cập nhật. Vui lòng thử lại.';
}

export function SettingsPage() {
  const { logout, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    userApi.getMe()
      .then(response => {
        setName(response.data.name);
        setPhone(response.data.phone || '');
      })
      .catch(error => setProfileMessage(errorText(error)));
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileBusy) return;
    setProfileBusy(true);
    setProfileMessage('');
    try {
      await userApi.updateMe({ name, phone });
      await refreshUser();
      setProfileMessage('Đã lưu hồ sơ');
    } catch (error) {
      setProfileMessage(errorText(error));
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu nhập lại chưa khớp.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setPasswordBusy(true);
    try {
      await api.post('/account/password', { currentPassword, newPassword });
      sessionStorage.setItem('passwordChanged', '1');
      logout();
    } catch (error) {
      setPasswordError(errorText(error));
    } finally {
      setPasswordBusy(false);
    }
  };

  const field = 'border rounded p-2 block w-full mt-1';

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Cài đặt tài khoản</h1>
      <form className="bg-white p-6 rounded space-y-4" onSubmit={saveProfile}>
        <label className="block">Họ tên
          <input required minLength={2} className={field} value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label className="block">Điện thoại
          <input className={field} value={phone} onChange={event => setPhone(event.target.value)} />
        </label>
        {profileMessage && <p role="status">{profileMessage}</p>}
        <Button type="submit" loading={profileBusy}>Lưu hồ sơ</Button>
      </form>

      <form className="bg-white p-6 rounded space-y-4" onSubmit={changePassword}>
        <h2 className="font-bold">Đổi mật khẩu</h2>
        <label className="block">Mật khẩu hiện tại
          <input type="password" autoComplete="current-password" required maxLength={72} className={field} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        </label>
        <label className="block">Mật khẩu mới
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={field} value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        </label>
        <label className="block">Nhập lại mật khẩu mới
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} className={field} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        </label>
        {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
        <Button type="submit" loading={passwordBusy}>Đổi mật khẩu và đăng nhập lại</Button>
      </form>
    </div>
  );
}
