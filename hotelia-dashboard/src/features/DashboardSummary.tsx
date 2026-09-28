import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, CalendarDays, RefreshCw, Star, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi, ownerApi, bookingApi } from '../lib/api/client';
import type { Booking } from '../types';
import './dashboard-summary.css';

const confirmedStatuses = ['PAID', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'];
const bookingStatus: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', PAID: 'Đã thanh toán', CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận phòng', CHECKED_OUT: 'Đã trả phòng', COMPLETED: 'Hoàn thành',
  CANCEL_REQUESTED: 'Yêu cầu hủy', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền', EXPIRED: 'Hết hạn',
};
const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export function DashboardSummary({ owner }: { owner: boolean }) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [summary, bookingResult] = await Promise.all([
        owner ? ownerApi.getDashboard() : adminApi.getStats(),
        owner ? bookingApi.getOwnerBookings() : bookingApi.getAdminBookings(),
      ]);
      setStats(owner ? summary.data.stats : summary.data);
      setBookings(bookingResult.data);
      setError('');
    } catch {
      setError('Không thể tải tổng quan. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [owner]);

  const year = new Date().getFullYear();
  const chart = Array.from({ length: 12 }, (_, month) => ({
    month: `T${month + 1}`,
    value: bookings.filter(booking => {
      const date = new Date(booking.createdAt);
      return date.getFullYear() === year && date.getMonth() === month && confirmedStatuses.includes(booking.status);
    }).reduce((sum, booking) => sum + booking.totalPrice, 0),
  }));

  const cards = owner ? [
    { label: 'Khách sạn', value: stats.totalHotels, icon: Building2, detail: 'Tài sản đang quản lý' },
    { label: 'Đã đăng', value: stats.publishedHotels, icon: BedDouble, detail: 'Hiển thị với khách' },
    { label: 'Đặt phòng', value: stats.totalBookings, icon: CalendarDays, detail: 'Tổng đơn trong hệ thống' },
    { label: 'Đang lưu trú', value: bookings.filter(booking => booking.status === 'CHECKED_IN').length, icon: Users, detail: 'Đơn đã nhận phòng' },
  ] : [
    { label: 'Người dùng', value: stats.users, icon: Users, detail: 'Tài khoản trên nền tảng' },
    { label: 'Chủ khách sạn', value: stats.owners, icon: Building2, detail: 'Đối tác quản lý' },
    { label: 'Khách sạn', value: stats.hotels, icon: BedDouble, detail: 'Khách sạn đã đăng' },
    { label: 'Đặt phòng', value: stats.bookings, icon: CalendarDays, detail: 'Tổng đơn trong hệ thống' },
  ];

  return (
    <div className="summary-page">
      <div className="summary-heading">
        <div>
          <p className="summary-eyebrow">{owner ? 'OWNER WORKSPACE' : 'ADMIN WORKSPACE'} <span aria-hidden="true">/</span> {year}</p>
          <h1>Tổng quan {owner ? 'khách sạn' : 'hệ thống'}</h1>
          <p className="summary-heading__description">{owner ? 'Theo dõi hoạt động lưu trú và các đơn đặt phòng của bạn.' : 'Nắm tình hình vận hành Hotelia từ một nơi.'}</p>
        </div>
        <button type="button" className="summary-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'is-spinning' : ''} aria-hidden="true" /> Làm mới
        </button>
      </div>

      {error && <div className="summary-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Thử lại</button></div>}

      {loading ? (
        <div className="summary-loading" aria-label="Đang tải dữ liệu tổng quan">
          <div className="summary-loading__stats">{Array.from({ length: 4 }, (_, index) => <div key={index} />)}</div>
          <div className="summary-loading__panel" />
        </div>
      ) : !error && (
        <>
          <section className="summary-stats" aria-label="Các chỉ số chính">
            {cards.map(({ label, value, icon: Icon, detail }) => (
              <article className="summary-stat" key={label}>
                <div className="summary-stat__top"><span>{label}</span><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></div>
                <strong>{formatNumber(value ?? 0)}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </section>

          <div className="summary-grid">
            <section className="summary-panel summary-panel--chart" aria-labelledby="summary-chart-title">
              <div className="summary-panel__header">
                <div><span className="summary-panel__eyebrow">HOẠT ĐỘNG / {year}</span><h2 id="summary-chart-title">Giá trị đặt phòng được xác nhận</h2></div>
              </div>
              <p className="summary-chart-note">Tính theo ngày tạo đơn, gồm cả đơn thanh toán tại khách sạn; không phải doanh thu đã thu.</p>
              <div className="summary-chart" role="img" aria-label={`Biểu đồ giá trị đặt phòng theo tháng năm ${year}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e8ede6" strokeDasharray="3 5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#718076', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} width={54} tick={{ fill: '#718076', fontSize: 11 }} tickFormatter={value => value >= 1000000 ? `${Math.round(value / 1000000)}tr` : formatNumber(value)} />
                    <Tooltip cursor={{ fill: '#eef3ec' }} formatter={(value: number) => [formatMoney(value), 'Giá trị đơn']} contentStyle={{ border: '1px solid #dce4dc', borderRadius: 10, boxShadow: '0 12px 30px rgba(33,53,44,.1)' }} />
                    <Bar dataKey="value" fill={owner ? '#4f7962' : '#526f77'} radius={[5, 5, 0, 0]} maxBarSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="summary-panel summary-panel--quick" aria-labelledby="summary-quick-title">
              <span className="summary-panel__eyebrow">LỐI TẮT</span>
              <h2 id="summary-quick-title">Tiếp tục công việc</h2>
              <p>Đi thẳng đến những mục bạn thường cần xử lý.</p>
              <div className="summary-shortcuts">
                <Link to={owner ? '/owner/bookings' : '/admin/bookings'}><CalendarDays size={18} /><span>Đơn đặt phòng</span><ArrowRight size={17} /></Link>
                <Link to={owner ? '/owner/hotels' : '/admin/hotels'}><Building2 size={18} /><span>Khách sạn</span><ArrowRight size={17} /></Link>
                <Link to={owner ? '/owner/reviews' : '/admin/owners'}><Star size={18} /><span>{owner ? 'Đánh giá' : 'Chủ khách sạn'}</span><ArrowRight size={17} /></Link>
              </div>
            </section>
          </div>

          <section className="summary-panel summary-recent" aria-labelledby="summary-recent-title">
            <div className="summary-panel__header">
              <div><span className="summary-panel__eyebrow">CẬP NHẬT MỚI</span><h2 id="summary-recent-title">Đặt phòng gần đây</h2></div>
              <Link to={owner ? '/owner/bookings' : '/admin/bookings'}>Xem tất cả <ArrowRight size={16} /></Link>
            </div>
            {bookings.length === 0 ? (
              <div className="summary-empty"><CalendarDays size={24} strokeWidth={1.6} /><p>Chưa có đặt phòng nào.</p></div>
            ) : (
              <div className="summary-recent__list">
                {bookings.slice(0, 5).map(booking => (
                  <div className="summary-recent__row" key={booking.id}>
                    <span className="summary-recent__guest"><strong>{booking.guestName}</strong><small>{new Date(booking.checkIn).toLocaleDateString('vi-VN')}</small></span>
                    <span className="summary-recent__status">{bookingStatus[booking.status] || booking.status}</span>
                    <strong className="summary-recent__price">{formatMoney(booking.totalPrice)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
