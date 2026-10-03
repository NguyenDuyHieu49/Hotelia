import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3, BedDouble, Building2, CalendarDays, ChevronLeft, ChevronRight,
  CreditCard, FileClock, Headphones, LayoutGrid, LogOut, MessageSquare,
  Settings2, ShieldCheck, Star, Users, X,
} from 'lucide-react';

type NavItem = { path: string; label: string; icon: typeof LayoutGrid };

const ownerNavigation: { label: string; items: NavItem[] }[] = [
  { label: 'Vận hành', items: [
    { path: '/owner/dashboard', label: 'Tổng quan', icon: LayoutGrid },
    { path: '/owner/hotels', label: 'Khách sạn của tôi', icon: Building2 },
    { path: '/owner/room-types', label: 'Loại phòng', icon: BedDouble },
    { path: '/owner/bookings', label: 'Đơn đặt phòng', icon: CalendarDays },
  ] },
  { label: 'Theo dõi', items: [
    { path: '/owner/reviews', label: 'Đánh giá', icon: Star },
    { path: '/owner/analytics', label: 'Thống kê', icon: BarChart3 },
    { path: '/owner/settings', label: 'Cài đặt', icon: Settings2 },
  ] },
];

const adminNavigation: { label: string; items: NavItem[] }[] = [
  { label: 'Điều hành', items: [
    { path: '/admin/dashboard', label: 'Tổng quan', icon: LayoutGrid },
    { path: '/admin/users', label: 'Người dùng', icon: Users },
    { path: '/admin/owners', label: 'Chủ khách sạn', icon: ShieldCheck },
    { path: '/admin/hotels', label: 'Khách sạn', icon: Building2 },
    { path: '/admin/bookings', label: 'Đơn đặt phòng', icon: CalendarDays },
  ] },
  { label: 'Kiểm soát', items: [
    { path: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
    { path: '/admin/reviews', label: 'Đánh giá', icon: Star },
    { path: '/admin/complaints', label: 'Khiếu nại', icon: MessageSquare },
    { path: '/admin/support', label: 'Yêu cầu hỗ trợ', icon: Headphones },
    { path: '/admin/audit-logs', label: 'Nhật ký hoạt động', icon: FileClock },
    { path: '/admin/settings', label: 'Cài đặt', icon: Settings2 },
  ] },
];

export function navigationFor(type: 'owner' | 'admin') {
  return type === 'owner' ? ownerNavigation : adminNavigation;
}

interface SidebarProps {
  type: 'owner' | 'admin';
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  type, userName = 'Người dùng', userEmail = '', onLogout,
  collapsed, onToggleCollapsed, mobileOpen, onCloseMobile,
}: SidebarProps) {
  const { pathname } = useLocation();
  const groups = navigationFor(type);

  return (
    <>
      {mobileOpen && <button type="button" className="dashboard-sidebar__scrim" aria-label="Đóng điều hướng" onClick={onCloseMobile} />}
      <aside className={`dashboard-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`} aria-label="Điều hướng quản lý">
        <div className="dashboard-sidebar__brand">
          <Link to={`/${type}/dashboard`} className="dashboard-sidebar__brand-link" onClick={onCloseMobile} aria-label="Hotelia — trang tổng quan">
            <span className="dashboard-sidebar__mark" aria-hidden="true"><img src="/brand/hotelia-mark.png" alt="" /></span>
            <span className="dashboard-sidebar__brand-copy"><strong>Hotelia</strong><small>{type === 'owner' ? 'Owner workspace' : 'Admin workspace'}</small></span>
          </Link>
          <button type="button" className="dashboard-sidebar__mobile-close" aria-label="Đóng menu" onClick={onCloseMobile}><X size={19} /></button>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Các mục quản lý">
          {groups.map(group => (
            <div className="dashboard-sidebar__group" key={group.label}>
              <p className="dashboard-sidebar__group-label">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
                return (
                  <Link key={item.path} to={item.path} onClick={onCloseMobile} className={`dashboard-sidebar__link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dashboard-sidebar__bottom">
          <div className="dashboard-sidebar__user">
            <span className="dashboard-sidebar__avatar" aria-hidden="true">{userName.trim().charAt(0).toUpperCase() || 'H'}</span>
            <span className="dashboard-sidebar__user-copy"><strong>{userName}</strong><small>{userEmail}</small></span>
          </div>
          <button type="button" className="dashboard-sidebar__logout" onClick={onLogout} title={collapsed ? 'Đăng xuất' : undefined}>
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" /><span>Đăng xuất</span>
          </button>
          <button type="button" className="dashboard-sidebar__collapse" onClick={onToggleCollapsed} aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span>Thu gọn menu</span>
          </button>
        </div>
      </aside>
    </>
  );
}
