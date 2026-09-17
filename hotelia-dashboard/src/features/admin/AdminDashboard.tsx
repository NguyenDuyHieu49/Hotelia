import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { adminApi } from '../../lib/api/client';
import { 
  Users, Building, Calendar, DollarSign, 
  AlertTriangle, Clock, CheckCircle, XCircle 
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22C55E', '#F59E0B', '#EF4444', '#6366F1'];

export function AdminDashboard() {
  const [stats, setStats] = useState<{
    users: number;
    owners: number;
    hotels: number;
    bookings: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h1>
          <p className="text-gray-500 mt-1">Xem tổng quan hoạt động của Hotelia</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium text-green-700">Hệ thống hoạt động</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng người dùng"
          value={stats?.users || 0}
          icon={<Users className="w-6 h-6" />}
          color="blue"
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Hotel Owners"
          value={stats?.owners || 0}
          icon={<Building className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Tổng khách sạn"
          value={stats?.hotels || 0}
          icon={<Building className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Tổng đặt phòng"
          value={stats?.bookings || 0}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
          trend={{ value: 23, isPositive: true }}
        />
      </div>

      {/* Pending Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Owner chờ xác minh</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Building className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">KS chờ phê duyệt</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Khiếu nại mới</p>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Giao dịch lỗi</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trend */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking theo tháng</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { month: 'T1', bookings: 120 },
                { month: 'T2', bookings: 135 },
                { month: 'T3', bookings: 150 },
                { month: 'T4', bookings: 142 },
                { month: 'T5', bookings: 168 },
                { month: 'T6', bookings: 180 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="bookings" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Booking Status Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái Booking</h3>
          <div className="h-64 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Hoàn thành', value: 65 },
                      { name: 'Đang xử lý', value: 20 },
                      { name: 'Đã hủy', value: 10 },
                      { name: 'Khác', value: 5 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
              {[
                { name: 'Hoàn thành', color: '#22C55E', value: 65 },
                { name: 'Đang xử lý', color: '#F59E0B', value: 20 },
                { name: 'Đã hủy', color: '#EF4444', value: 10 },
                { name: 'Khác', color: '#6366F1', value: 5 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-medium ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
        <div className="space-y-4">
          {[
            { action: 'Owner ABC Hotel đăng ký mới', time: '5 phút trước', icon: <Building className="w-4 h-4" /> },
            { action: 'Khách sạn XYZ được duyệt', time: '15 phút trước', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { action: 'Booking #12345 đã thanh toán', time: '30 phút trước', icon: <DollarSign className="w-4 h-4 text-blue-500" /> },
            { action: 'User mới đăng ký', time: '1 giờ trước', icon: <Users className="w-4 h-4" /> },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">{activity.icon}</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
