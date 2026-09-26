import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';

export function SimpleLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/owner/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>
          🏨 Hotelia
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>
          Dashboard Login
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            color: '#c00',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Đăng nhập
        </button>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          <p>Tài khoản Owner:</p>
          <p>manager@hotelia.com / OwnerPass123!</p>
        </div>
      </div>
    </div>
  );
}
