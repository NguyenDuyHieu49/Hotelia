import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building, Bed, Calendar, Star, 
  BarChart3, Settings, LogOut, ChevronLeft, Menu,
  Users, Shield, CreditCard, MessageSquare, FileText
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  type: 'owner' | 'admin';
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const ownerMenuItems = [
  { path: '/owner/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/owner/hotels', label: 'Khách sạn của tôi', icon: Building },
  { path: '/owner/room-types', label: 'Loại phòng', icon: Bed },
  { path: '/owner/bookings', label: 'Đơn đặt phòng', icon: Calendar },
  { path: '/owner/reviews', label: 'Đánh giá', icon: Star },
  { path: '/owner/analytics', label: 'Thống kê', icon: BarChart3 },
  { path: '/owner/settings', label: 'Cài đặt', icon: Settings },
];

const adminMenuItems = [
  { path: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Người dùng', icon: Users },
  { path: '/admin/owners', label: 'Hotel Owner', icon: Shield },
  { path: '/admin/hotels', label: 'Khách sạn', icon: Building },
  { path: '/admin/bookings', label: 'Đơn đặt phòng', icon: Calendar },
  { path: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
  { path: '/admin/reviews', label: 'Đánh giá', icon: Star },
  { path: '/admin/complaints', label: 'Khiếu nại', icon: MessageSquare },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { path: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export function Sidebar({ type, userName = 'User', userEmail = '', onLogout }: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuItems = type === 'owner' ? ownerMenuItems : adminMenuItems;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full bg-admin-sidebar flex flex-col
        transition-all duration-300 z-40
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-white">🏨 Hotelia</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {type === 'owner' ? 'Owner Dashboard' : 'Admin Panel'}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${isActive 
                  ? 'bg-white text-admin-sidebar font-medium' 
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      {type === 'admin' && <Link to="/admin/support" className="block px-4 py-3 rounded-lg hover:bg-gray-100">Yêu cầu hỗ trợ</Link>}
        </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className={`
            w-full mt-4 flex items-center justify-center gap-2 px-4 py-2
            text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition
            ${isCollapsed ? '' : ''}
          `}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
