import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu } from 'lucide-react';
import { Sidebar, navigationFor } from './Sidebar';
import { useAuth } from '../../lib/auth/AuthContext';
import './dashboard.css';

interface LayoutProps {
  children: ReactNode;
  type: 'owner' | 'admin';
}

export function Layout({ children, type }: LayoutProps) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage = navigationFor(type).flatMap(group => group.items).find(item => item.path === pathname);
  const dashboardPath = `/${type}/dashboard`;

  useEffect(() => {
    setMobileOpen(false);
    document.title = `${currentPage?.label || 'Quản lý'} · Hotelia`;
  }, [pathname, currentPage?.label]);

  return (
    <div className="dashboard-shell" data-role={type} data-collapsed={collapsed}>
      <a className="dashboard-skip-link" href="#dashboard-main">Bỏ qua điều hướng</a>
      <Sidebar
        type={type}
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(value => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__location">
            <button type="button" className="dashboard-topbar__menu" aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div className="dashboard-topbar__breadcrumb">
              <Link to={dashboardPath}>Hotelia</Link>
              <span aria-hidden="true">/</span>
              <strong>{currentPage?.label || 'Quản lý'}</strong>
            </div>
          </div>
          <div className="dashboard-topbar__actions">
            <span className="dashboard-topbar__role">{type === 'owner' ? 'Đối tác khách sạn' : 'Quản trị hệ thống'}</span>
            <Link to={`/${type}/settings`} className="dashboard-topbar__account" aria-label="Mở cài đặt tài khoản">
              <span className="dashboard-topbar__account-avatar">{user?.name?.trim().charAt(0).toUpperCase() || 'H'}</span>
              <span className="dashboard-topbar__account-name">{user?.name || 'Tài khoản'}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main className="dashboard-content" id="dashboard-main" tabIndex={-1}>
          <div className="dashboard-content__inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
