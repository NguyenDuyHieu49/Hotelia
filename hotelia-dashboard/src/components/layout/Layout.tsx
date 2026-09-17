import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../lib/auth/AuthContext';

interface LayoutProps {
  children: ReactNode;
  type: 'owner' | 'admin';
}

export function Layout({ children, type }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-admin-bg">
      <Sidebar
        type={type}
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
      />
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
