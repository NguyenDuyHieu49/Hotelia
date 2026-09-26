import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';
import './SimpleLogin.css';

export function SimpleLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      const user = await login(email.trim(), password);
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/owner/dashboard', { replace: true });
    } catch (err) {
      const message = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      setError(message.response?.status === 401
        ? 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra và thử lại.'
        : message.response?.data?.message || message.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page" id="main-content">
      <aside className="login-story" aria-label="Hotelia">
        <div className="login-story__image" aria-hidden="true" />
        <div className="login-story__shade" aria-hidden="true" />
        <div className="login-story__content">
          <div className="login-brand login-brand--light">
            <span className="login-brand__mark" aria-hidden="true">H<span>.</span></span>
            <span className="login-brand__name">hotelia</span>
          </div>
          <div className="login-story__copy">
            <span className="login-eyebrow">Không gian quản lý</span>
            <h1>Mỗi kỳ lưu trú<br />bắt đầu từ đây.</h1>
            <p>Một nơi để chăm chút khách sạn, đặt phòng và trải nghiệm của khách.</p>
          </div>
          <div className="login-story__footer">
            <span>HOTELIA / MANAGEMENT</span>
            <span>VIETNAM · {new Date().getFullYear()}</span>
          </div>
        </div>
      </aside>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel__inner">
          <div className="login-brand login-brand--mobile">
            <span className="login-brand__mark" aria-hidden="true">H<span>.</span></span>
            <span className="login-brand__name">hotelia</span>
          </div>
          <div className="login-panel__heading">
            <span className="login-eyebrow">TÀI KHOẢN QUẢN LÝ</span>
            <h2 id="login-title">Chào mừng trở lại<span className="login-period">.</span></h2>
            <p>Đăng nhập để tiếp tục công việc hôm nay.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">Email công việc</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                placeholder="ten@khachsan.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={busy}>
              <span>{busy ? 'Đang đăng nhập…' : 'Vào trang quản lý'}</span>
              {busy ? <span className="login-submit__loader" aria-hidden="true" /> : (
                <svg className="login-submit__arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>

          <div className="login-panel__footnote">
            <span className="login-footnote__rule" />
            <p>Dành cho quản trị viên và đối tác khách sạn.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
