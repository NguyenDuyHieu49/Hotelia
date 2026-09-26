import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import api from '../services/api'

export default function Hotels() {
  const [pendingHotels, setPendingHotels] = useState([])
  const [allHotels, setAllHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    loadHotels()
  }, [])

  const loadHotels = async () => {
    try {
      const res = await api.get('/admin/hotels/pending')
      setPendingHotels(res.data)
      setAllHotels((await api.get('/admin/hotels')).data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/hotels/${id}/approve`)
      loadHotels()
      alert('Approved!')
    } catch (err) {
      alert('Error')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:')
    if (reason) {
      try {
        await api.post(`/admin/hotels/${id}/reject`, { reason })
        loadHotels()
        alert('Rejected!')
      } catch (err) {
        alert('Error')
      }
    }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Khách sạn</h1>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'pending' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Chờ duyệt ({pendingHotels.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Tất cả
        </button>
      </div>

      {/* Hotels List */}
      <div className="space-y-4">
        {activeTab === 'pending' && pendingHotels.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            Không có khách sạn nào chờ duyệt
          </div>
        )}
        
        {activeTab === 'pending' && pendingHotels.map(hotel => (
          <HotelCard 
            key={hotel._id} 
            hotel={hotel}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {activeTab === 'all' && allHotels.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">Chưa có khách sạn</div>
        )}
        {activeTab === 'all' && allHotels.map(hotel => (
          <HotelCard key={hotel._id} hotel={hotel} onApprove={handleApprove} onReject={handleReject} />
        ))}
      </div>
    </div>
  )
}

function HotelCard({ hotel, onApprove, onReject }) {
  const statusColors = {
    PUBLISHED: 'bg-green-100 text-green-700',
    PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
    DRAFT: 'bg-gray-100 text-gray-700',
    REJECTED: 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-4xl">🏨</span>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{hotel.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs ${statusColors[hotel.status] || ''}`}>
              {hotel.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-2">{hotel.address}, {hotel.city}</p>
          <div className="flex items-center gap-2">
            {hotel.starRating && (
              <div className="flex">
                {Array(hotel.starRating).fill(0).map((_, i) => (
                  <span key={i} className="text-yellow-400">⭐</span>
                ))}
              </div>
            )}
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-500">
              {hotel.reviewCount || 0} đánh giá
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{hotel.description}</p>
        </div>

        {hotel.status === 'PENDING_APPROVAL' && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(hotel._id)}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => onReject(hotel._id)}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
