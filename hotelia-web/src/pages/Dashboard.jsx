import { useState, useEffect } from 'react'
import { Users, Building, Calendar, Star, TrendingUp, Clock } from 'lucide-react'
import api from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (loading) return <div className="text-center py-20">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Tổng Người dùng" 
          value={stats?.users || 0} 
          icon={<Users className="w-6 h-6" />} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Chủ Khách sạn" 
          value={stats?.owners || 0} 
          icon={<Building className="w-6 h-6" />} 
          color="bg-green-500"
        />
        <StatCard 
          title="Khách sạn" 
          value={stats?.hotels || 0} 
          icon={<Star className="w-6 h-6" />} 
          color="bg-orange-500"
        />
        <StatCard 
          title="Đặt phòng" 
          value={stats?.bookings || 0} 
          icon={<Calendar className="w-6 h-6" />} 
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/owners" className="p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Duyệt Chủ KS</p>
                <p className="text-sm text-gray-500">Xem yêu cầu mới</p>
              </div>
            </div>
          </a>
          <a href="/hotels" className="p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Duyệt Khách sạn</p>
                <p className="text-sm text-gray-500">Phê duyệt khách sạn mới</p>
              </div>
            </div>
          </a>
          <a href="/bookings" className="p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Quản lý Đặt phòng</p>
                <p className="text-sm text-gray-500">Xem tất cả bookings</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <div className="text-white">{icon}</div>
        </div>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>
      <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
      <p className="text-gray-500 text-sm">{title}</p>
    </div>
  )
}
