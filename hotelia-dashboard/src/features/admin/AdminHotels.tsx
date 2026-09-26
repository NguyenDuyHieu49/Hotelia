import { HotelEditor } from '../owner/HotelEditor';
import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { adminApi } from '../../lib/api/client';
import { Building, CheckCircle, XCircle, Clock, Star, MapPin, Search } from 'lucide-react';
import type { Hotel, HotelStatus } from '../../types';

const statusConfig: Record<HotelStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT: { label: 'Bản nháp', variant: 'default' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', variant: 'warning' },
  PUBLISHED: { label: 'Đã đăng', variant: 'success' },
  REJECTED: { label: 'Từ chối', variant: 'danger' },
  SUSPENDED: { label: 'Tạm ngưng', variant: 'danger' },
};

export function AdminHotels() {
  const [selected,setSelected]=useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HotelStatus | 'ALL'>('ALL');

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      const res = await adminApi.getHotels();
      setHotels(res.data);
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    if (confirm('Duyệt khách sạn này?')) {
      try {
        await adminApi.approveHotel(id);
        loadHotels();
        alert('Đã duyệt khách sạn!');
      } catch (error) {
        alert('Không thể duyệt khách sạn');
      }
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối:');
    if (reason) {
      try {
        await adminApi.rejectHotel(id, reason);
        loadHotels();
        alert('Đã từ chối khách sạn');
      } catch (error) {
        alert('Không thể từ chối khách sạn');
      }
    }
  };

  const filteredHotels = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selected && <HotelEditor hotel={selected} readOnly onClose={()=>setSelected(null)} />}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách sạn</h1>
        <p className="text-gray-500 mt-1">Duyệt và quản lý khách sạn trên nền tảng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <Input
            placeholder="Tìm kiếm khách sạn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'Tất cả' : 
               status === 'PENDING_APPROVAL' ? 'Chờ duyệt' :
               status === 'PUBLISHED' ? 'Đã đăng' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-3 cursor-pointer hover:border-blue-300" onClick={() => setStatusFilter('PENDING_APPROVAL')}>
          <div className="p-3 bg-amber-100 rounded-lg">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{hotels.filter(h => h.status === 'PENDING_APPROVAL').length}</p>
            <p className="text-sm text-gray-500">Chờ duyệt</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 cursor-pointer hover:border-green-300" onClick={() => setStatusFilter('PUBLISHED')}>
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{hotels.filter(h => h.status === 'PUBLISHED').length}</p>
            <p className="text-sm text-gray-500">Đã đăng</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 cursor-pointer hover:border-red-300" onClick={() => setStatusFilter('REJECTED')}>
          <div className="p-3 bg-red-100 rounded-lg">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{hotels.filter(h => h.status === 'REJECTED').length}</p>
            <p className="text-sm text-gray-500">Từ chối</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{hotels.length}</p>
            <p className="text-sm text-gray-500">Tổng số</p>
          </div>
        </Card>
      </div>

      {/* Hotels List */}
      <div className="space-y-4">
        {filteredHotels.length === 0 ? (
          <Card className="text-center py-12">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Không tìm thấy khách sạn</h3>
          </Card>
        ) : (
          filteredHotels.map((hotel) => {
            const status = statusConfig[hotel.status];
            return (
              <Card key={hotel.id}>
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="w-32 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="w-8 h-8 text-gray-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <button className="text-lg font-semibold text-blue-700 text-left" onClick={()=>setSelected(hotel)}>{hotel.name}</button>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
                          <MapPin className="w-4 h-4" />
                          {hotel.address}, {hotel.city}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        {Array(hotel.starRating || 0).fill(0).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {hotel.reviewCount ? `${hotel.averageRating.toFixed(1)} (${hotel.reviewCount} đánh giá)` : 'Chưa có đánh giá'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2">{hotel.description}</p>
                  </div>
                  
                  {/* Actions */}
                  {hotel.status === 'PENDING_APPROVAL' && (
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => handleApprove(hotel.id)} size="sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Duyệt
                      </Button>
                      <Button variant="danger" onClick={() => handleReject(hotel.id)} size="sm">
                        <XCircle className="w-4 h-4 mr-1" />
                        Từ chối
                      </Button>
                    </div>
                  )}
                </div>
                
                {hotel.status === 'REJECTED' && hotel.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Lý do từ chối:</p>
                    <p className="text-sm text-red-600">{hotel.rejectionReason}</p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
