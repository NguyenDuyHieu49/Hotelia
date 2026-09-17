import { useState, useEffect } from 'react'
import { Check, X, Mail, Building } from 'lucide-react'
import api from '../services/api'

export default function Owners() {
  const [pendingOwners, setPendingOwners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOwners()
  }, [])

  const loadOwners = async () => {
    try {
      const res = await api.get('/admin/owners/pending')
      setPendingOwners(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleApprove = async (id) => {
    if (confirm('Approve this owner?')) {
      try {
        await api.post(`/admin/owners/${id}/approve`)
        loadOwners()
      } catch (err) {
        alert('Error approving')
      }
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:')
    if (reason) {
      try {
        await api.post(`/admin/owners/${id}/reject`, { reason })
        loadOwners()
      } catch (err) {
        alert('Error rejecting')
      }
    }
  }

  if (loading) return <div className="text-center py-20">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Chủ khách sạn</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Yêu cầu chờ duyệt</h2>
        <p className="text-gray-500 text-sm">{pendingOwners.length} yêu cầu</p>
      </div>

      <div className="space-y-4">
        {pendingOwners.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            Không có yêu cầu nào
          </div>
        )}
        
        {pendingOwners.map(owner => (
          <div key={owner._id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{owner.name}</h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <Mail className="w-4 h-4" />
                    {owner.email}
                  </div>
                  {owner.businessName && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                      <Building className="w-4 h-4" />
                      {owner.businessName}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(owner._id)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Duyệt
                </button>
                <button
                  onClick={() => handleReject(owner._id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
