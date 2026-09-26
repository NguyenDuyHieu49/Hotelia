import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { reviewApi } from '../../lib/api/client';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';
import type { Review } from '../../types';

export function OwnerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const res = await reviewApi.getOwnerReviews();
      setReviews(res.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
    setLoading(false);
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      await reviewApi.reply(reviewId, replyText);
      setReplyingTo(null);
      setReplyText('');
      loadReviews();
    } catch (error) {
      alert('Không thể gửi phản hồi');
    }
  };

  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(filter));
  const visibleReviews = reviews.filter(r => r.isVisible);

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
          <h1 className="text-2xl font-bold text-gray-900">Đánh giá</h1>
          <p className="text-gray-500 mt-1">Quản lý đánh giá từ khách hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Trung bình:</span>
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-xl font-bold">
              {(visibleReviews.reduce((acc, r) => acc + r.rating, 0) / visibleReviews.length || 0).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', '5', '4', '3', '2', '1'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tất cả' : `${f} sao`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Chưa có đánh giá nào</h3>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              {!review.isVisible && <p className="mb-3 text-sm text-amber-700">Đánh giá đã bị ẩn, không tính vào điểm công khai.</p>}
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {review.user?.name || 'Khách hàng'}
                      </span>
                      <div className="flex">
                        {Array(5).fill(0).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  {review.title && (
                    <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                  )}
                  
                  <p className="text-gray-600 mb-3">{review.content}</p>
                  
                  {/* Owner Reply */}
                  {review.ownerReply && (
                    <div className="pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded-r-lg mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Phản hồi của bạn</span>
                      </div>
                      <p className="text-sm text-blue-800">{review.ownerReply}</p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    {!review.ownerReply && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Phản hồi
                      </Button>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{review.helpfulCount} hữu ích</span>
                    </div>
                  </div>
                  
                  {/* Reply Form */}
                  {replyingTo === review.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Viết phản hồi..."
                        className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                          Hủy
                        </Button>
                        <Button size="sm" onClick={() => handleReply(review.id)}>
                          Gửi phản hồi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
