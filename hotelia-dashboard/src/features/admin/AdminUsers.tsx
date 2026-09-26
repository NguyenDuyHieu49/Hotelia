import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { adminApi } from '../../lib/api/client';
import { Search, Ban, CheckCircle, Mail } from 'lucide-react';
import type { User as UserType, UserRole, UserStatus } from '../../types';

const roleConfig: Record<UserRole, { label: string; variant: 'default' | 'info' | 'success' }> = {
  USER: { label: 'User', variant: 'default' },
  OWNER: { label: 'Owner', variant: 'info' },
  ADMIN: { label: 'Admin', variant: 'success' },
};

const statusConfig: Record<UserStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  ACTIVE: { label: 'Hoạt động', variant: 'success' },
  INACTIVE: { label: 'Không hoạt động', variant: 'default' },
  SUSPENDED: { label: 'Tạm khóa', variant: 'warning' },
  BANNED: { label: 'Bị ban', variant: 'danger' },
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers({ limit: 100 });
      setUsers(res.data.users || res.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const handleSuspend = async (id: string) => {
    if (confirm('Bạn có chắc muốn khóa tài khoản này?')) {
      try {
        await adminApi.suspendUser(id);
        loadUsers();
      } catch (error) {
        alert('Không thể khóa tài khoản');
      }
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await adminApi.activateUser(id);
      loadUsers();
    } catch (error) {
      alert('Không thể kích hoạt tài khoản');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
        <p className="text-gray-500 mt-1">Xem và quản lý tài khoản người dùng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'USER', 'OWNER', 'ADMIN'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                roleFilter === role 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role === 'ALL' ? 'Tất cả' : roleConfig[role].label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy người dùng
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = roleConfig[user.role];
                  const status = statusConfig[user.status] || { label: user.status, variant: 'default' as const };
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.status === 'ACTIVE' ? (
                            <Button variant="ghost" size="sm" onClick={() => handleSuspend(user.id)}>
                              <Ban className="w-4 h-4 mr-1" />
                              Khóa
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleActivate(user.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Kích hoạt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
