import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, userApi } from '../api/client';
import type { User } from '../../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('refreshToken');
    if (token) {
      loadUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const res = await userApi.getMe();
      setUser(res.data);
    } catch (err) {
      console.error('AuthContext: Error loading user:', err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!['ADMIN', 'OWNER'].includes(res.data.user.role)) {
      throw new Error('Tài khoản này không có quyền truy cập trang quản trị.');
    }
    localStorage.setItem('accessToken', res.data.accessToken);
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        refreshUser: loadUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
