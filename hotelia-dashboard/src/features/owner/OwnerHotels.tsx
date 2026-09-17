import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { hotelApi } from '../../lib/api/client';
import { Building, Plus, MapPin, Star, Edit, Eye, Trash2 } from 'lucide-react';
import type { Hotel, HotelStatus } from '../../types';

const statusConfig: Record<HotelStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT: { label: 'Bản nháp', variant: 'default' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', variant: 'warning' },
  PUBLISHED: { label: 'Đã đăng', variant: 'success' },
  REJECTED: { label: 'Bị từ chối', variant: 'danger' },
  SUSPENDED: { label: 'Tạm ngưng', variant: 'danger' },
};

export function OwnerHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      const res = await hotelApi.getMyHotels();
      setHotels(res.data);
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa khách sạn này?')) {
      try {
        await hotelApi.deleteHotel(id);
        loadHotels();
      } catch (error) {
        alert('Không thể xóa khách sạn');
      }
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Khách sạn của tôi</h1>
          <p className="text-gray-500 mt-1">Quản lý danh sách khách sạn</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Thêm khách sạn
        </Button>
      </div>

      {/* Hotels List */}
      {hotels.length === 0 ? (
        <Card className="text-center py-12">
          <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Chưa có khách sạn nào</h3>
          <p className="text-gray-500 mt-1">Bắt đầu bằng cách thêm khách sạn đầu tiên</p>
          <Button className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Thêm khách sạn
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => {
            const status = statusConfig[hotel.status] || { label: hotel.status, variant: 'default' as const };
            return (
              <Card key={hotel.id} padding="none" className="overflow-hidden">
                {/* Image */}
                <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Building className="w-12 h-12 text-gray-400" />
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{hotel.name}</h3>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{hotel.address}, {hotel.city}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-4">
                    {Array(hotel.starRating || 0).fill(0).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      {hotel.averageRating?.toFixed(1) || '0.0'} ({hotel.reviewCount || 0} đánh giá)
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Xem
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Sửa
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(hotel.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
