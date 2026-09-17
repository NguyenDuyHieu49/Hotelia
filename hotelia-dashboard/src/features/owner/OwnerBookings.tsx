import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { bookingApi } from '../../lib/api/client';
import { Search, Calendar, User, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import type { Booking, BookingStatus } from '../../types';

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning' },
  PAID: { label: 'Đã thanh toán', variant: 'info' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  CHECKED_IN: { label: 'Đã nhận phòng', variant: 'info' },
  CHECKED_OUT: { label: 'Đã trả phòng', variant: 'default' },
  COMPLETED: { label: 'Hoàn thành', variant: 'success' },
  CANCEL_REQUESTED: { label: 'Yêu cầu hủy', variant: 'danger' },
  CANCELLED: { label: 'Đã hủy', variant: 'danger' },
  REFUNDED: { label: 'Đã hoàn tiền', variant: 'default' },
  EXPIRED: { label: 'Hết hạn', variant: 'default' },
};

export function OwnerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await bookingApi.getMyBookings();
      setBookings(res.data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const filteredBookings = bookings.filter(b => 
    b.guestName.toLowerCase().includes(search.toLowerCase()) ||
    b.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Đơn đặt phòng</h1>
        <p className="text-gray-500 mt-1">Quản lý đơn đặt phòng của bạn</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Input
          placeholder="Tìm kiếm theo tên, email, mã đơn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Bookings Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đêm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Không có đơn đặt phòng nào
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const status = statusConfig[booking.status] || { label: booking.status, variant: 'default' as const };
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm">{booking.id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.guestName}</p>
                            <p className="text-xs text-gray-500">{booking.guestEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{booking.nights} đêm</td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">
                        {formatCurrency(booking.totalPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Chi tiết đơn #{selectedBooking.id.slice(-8).toUpperCase()}</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Trạng thái</span>
                <Badge variant={statusConfig[selectedBooking.status]?.variant || 'default'}>
                  {statusConfig[selectedBooking.status]?.label || selectedBooking.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ngày nhận phòng</p>
                  <p className="font-medium">{formatDate(selectedBooking.checkIn)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày trả phòng</p>
                  <p className="font-medium">{formatDate(selectedBooking.checkOut)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Thông tin khách hàng</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.guestName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.guestEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedBooking.guestPhone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span>Giá phòng/đêm</span>
                  <span>{formatCurrency(selectedBooking.roomPrice)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Số đêm</span>
                  <span>{selectedBooking.nights}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{formatCurrency(selectedBooking.totalPrice)}</span>
                </div>
              </div>

              {selectedBooking.specialRequests && (
                <div>
                  <p className="text-sm text-gray-500">Yêu cầu đặc biệt</p>
                  <p className="mt-1 text-gray-700">{selectedBooking.specialRequests}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                {selectedBooking.status === 'PAID' && (
                  <button className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Xác nhận đặt phòng
                  </button>
                )}
                {selectedBooking.status === 'CONFIRMED' && (
                  <button className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Xác nhận nhận phòng
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
