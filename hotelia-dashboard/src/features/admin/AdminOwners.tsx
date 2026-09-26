import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../lib/api/client';
import { Building, CheckCircle, XCircle, Clock, Shield, Mail } from 'lucide-react';
import type { User as HotelUser } from '../../types';

export function AdminOwners() {
  const [owners, setOwners] = useState<HotelUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      const res = await adminApi.getOwners();
      setOwners(res.data);
    } catch (error) {
      console.error('Error loading owners:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    if (confirm('Duyệt owner này?')) {
      try {
        await adminApi.approveOwner(id);
        loadOwners();
        alert('Đã duyệt owner!');
      } catch (error) {
        alert('Không thể duyệt owner');
      }
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối:');
    if (reason) {
      try {
        await adminApi.rejectOwner(id, reason);
        loadOwners();
        alert('Đã từ chối owner');
      } catch (error) {
        alert('Không thể từ chối owner');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hotel Owners</h1>
        <p className="text-gray-500 mt-1">Quản lý và xác minh chủ khách sạn</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{owners.filter(o => o.ownerStatus === 'PENDING').length}</p>
            <p className="text-sm text-gray-500">Chờ xác minh</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{owners.filter(o => o.ownerStatus === 'APPROVED').length}</p>
            <p className="text-sm text-gray-500">Đã duyệt</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-lg">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{owners.filter(o => o.ownerStatus === 'REJECTED').length}</p>
            <p className="text-sm text-gray-500">Đã từ chối</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{owners.length}</p>
            <p className="text-sm text-gray-500">Tổng số</p>
          </div>
        </Card>
      </div>

      {/* Owners List */}
      <div className="space-y-4">
        {owners.length === 0 ? (
          <Card className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Không có owner nào</h3>
          </Card>
        ) : (
          owners.map((owner) => (
            <Card key={owner.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{owner.name}</h3>
                      <Badge 
                        variant={
                          owner.ownerStatus === 'APPROVED' ? 'success' : 
                          owner.ownerStatus === 'PENDING' ? 'warning' : 'danger'
                        }
                      >
                        {owner.ownerStatus === 'APPROVED' ? 'Đã duyệt' :
                         owner.ownerStatus === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <Mail className="w-4 h-4" />
                      {owner.email}
                    </div>
                    {owner.businessName && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Building className="w-4 h-4" />
                        {owner.businessName}
                      </div>
                    )}
                  </div>
                </div>
                
                {owner.ownerStatus === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(owner.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Duyệt
                    </Button>
                    <Button variant="danger" onClick={() => handleReject(owner.id)}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
