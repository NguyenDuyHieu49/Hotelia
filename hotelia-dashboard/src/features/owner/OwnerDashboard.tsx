import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { ownerApi, hotelApi, bookingApi, reviewApi } from '../../lib/api/client';
import { 
  Building, Calendar, Star, DollarSign, 
  Users, TrendingUp, Clock, AlertCircle 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OwnerStats {
  todayRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  averageRating: number;
  availableRooms: number;
  pendingBookings: number;
}

export function OwnerDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, bookingsRes] = await Promise.all([
        ownerApi.getDashboard(),
        bookingApi.getMyBookings(),
      ]);
      setStats(dashboardRes.data.stats);
      setRecentBookings(bookingsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', '').trim() + 'đ';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500 mt-1">Chào mừng bạn quay trở lại!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Doanh thu hôm nay"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Doanh thu tháng này"
          value={formatCurrency(stats?.monthRevenue || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Đơn đặt phòng"
          value={stats?.totalBookings || 0}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Công suất phòng"
          value={`${stats?.occupancyRate || 0}%`}
          icon={<Building className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Đánh giá TB"
          value={stats?.averageRating?.toFixed(1) || '0.0'}
          icon={<Star className="w-6 h-6" />}
          color="yellow"
        />
        <StatCard
          title="Phòng trống"
          value={stats?.availableRooms || 0}
          icon={<Building className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Booking chờ xử lý"
          value={stats?.pendingBookings || 0}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Khách đã checkout"
          value={12}
          icon={<Users className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Doanh thu theo tháng</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { month: 'T1', revenue: 45 },
                { month: 'T2', revenue: 52 },
                { month: 'T3', revenue: 48 },
                { month: 'T4', revenue: 61 },
                { month: 'T5', revenue: 55 },
                { month: 'T6', revenue: 67 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563EB" 
                  strokeWidth={2}
                  dot={{ fill: '#2563EB', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Đơn gần đây</h3>
            <a href="/owner/bookings" className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Chưa có đơn đặt phòng</p>
            ) : (
              recentBookings.map((booking: unknown) => {
                const b = booking as { id: string; guestName: string; checkIn: string; totalPrice: number; status: string };
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{b.guestName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(b.checkIn).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(b.totalPrice)}</p>
                      <Badge variant={b.status === 'CONFIRMED' ? 'success' : 'warning'}>
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {stats?.pendingBookings && stats.pendingBookings > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-gray-900">Có {stats.pendingBookings} đơn cần xử lý</p>
              <p className="text-sm text-gray-500">Vui lòng kiểm tra và xác nhận đơn đặt phòng</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
