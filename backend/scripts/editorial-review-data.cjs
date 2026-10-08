const crypto = require('node:crypto');

// Deterministic editorial data for UI demonstrations. These are not guest reviews.
const phrases = {
  5: [
    ['Vị trí là điểm cộng cho một lịch trình khám phá thành phố.', 'The location stands out for a city itinerary.'],
    ['Không gian lưu trú tạo cảm giác dễ chịu trong chuyến đi.', 'The setting feels welcoming for a trip.'],
    ['Một lựa chọn đáng chú ý khi tìm nơi nghỉ tại khu vực này.', 'A notable option when browsing stays in this area.'],
    ['Ấn tượng tổng thể tích cực khi xem các lựa chọn lưu trú.', 'A positive overall impression among the available stays.'],
  ],
  4: [
    ['Phù hợp để cân nhắc cho chuyến đi ngắn ngày.', 'Worth considering for a short trip.'],
    ['Vị trí và phong cách là hai điểm đáng tham khảo.', 'The location and style are worth a look.'],
    ['Một lựa chọn khá cân bằng cho lịch trình tham quan.', 'A fairly balanced option for a sightseeing itinerary.'],
    ['Thông tin tổng quan giúp dễ so sánh với các nơi ở khác.', 'The overview makes it easy to compare with other stays.'],
  ],
  3: [
    ['Nên đối chiếu thêm vị trí và nhu cầu trước khi chọn.', 'Compare the location with your needs before choosing.'],
    ['Có thể phù hợp với một số lịch trình, tùy ưu tiên cá nhân.', 'May suit some itineraries, depending on personal priorities.'],
    ['Nên xem kỹ thông tin phòng và chính sách khi được cập nhật.', 'Check room details and policies once they are available.'],
    ['Cần thêm thông tin để đánh giá đầy đủ lựa chọn này.', 'More information is needed for a complete assessment.'],
  ],
  2: [
    ['Thông tin hiện có còn hạn chế để đưa ra lựa chọn chắc chắn.', 'The available information is too limited for a confident choice.'],
    ['Nên so sánh thêm các khách sạn khác trong cùng khu vực.', 'Compare other hotels in the same area as well.'],
  ],
};

function editorialData(name, city, index) {
  const count = 10 + ((index * 17) % 41);
  const reviews = Array.from({ length: count }, (_, position) => {
    const seed = crypto.createHash('sha256').update(`${name}:${index}:${position}`).digest();
    const value = seed[0] / 255;
    const rating = value < 0.47 ? 5 : value < 0.83 ? 4 : value < 0.96 ? 3 : 2;
    const options = phrases[rating];
    const [vi, en] = options[seed[1] % options.length];
    return {
      rating,
      contentVi: `${vi} · ${city}`,
      contentEn: `${en} · ${city}`,
    };
  });
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / count;
  return {
    demoRating: Number(average.toFixed(1)),
    demoReviewCount: count,
    demoReviews: reviews,
  };
}

module.exports = { editorialData };
