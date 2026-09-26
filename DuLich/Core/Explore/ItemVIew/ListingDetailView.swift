import SwiftUI

struct HotelDetailView: View {
    let hotel: Hotel
    @State private var showBooking = false
    @State private var reviews: [Review] = []
    @State private var isLoadingReviews = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Hero Image
                hotelImageSection

                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    // Header Info
                    headerSection

                    Divider()

                    // Location
                    locationSection

                    Divider()

                    // Description
                    descriptionSection

                    // Amenities
                    if let amenities = hotel.amenities, !amenities.isEmpty {
                        Divider()
                        amenitiesSection(amenities)
                    }

                    Divider()

                    // Reviews
                    reviewsSection

                    Divider()

                    // Policies
                    policiesSection

                    // Book Button
                    bookButtonSection
                }
                .padding(AppSpacing.base)
            }
        }
        .background(AppColors.backgroundPrimary)
        .navigationTitle("Chi tiết khách sạn")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
        .sheet(isPresented: $showBooking) {
            RoomBookingView(hotel: hotel)
        }
        .task {
            await loadReviews()
        }
        .task(id: hotel.id) {
            await RecommendationService.shared.recordView(hotelId: hotel.id)
        }
    }

    // MARK: - Sections
    private var hotelImageSection: some View {
        ZStack(alignment: .bottomLeading) {
            if let images = hotel.images, !images.isEmpty, let firstImage = images.first {
                AsyncImage(url: APIClient.shared.mediaURL(firstImage)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        imagePlaceholder
                    }
                }
            } else {
                imagePlaceholder
            }

            // Gradient overlay
            LinearGradient(
                colors: [.clear, .black.opacity(0.5)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 100)

            // Rating Badge
            HStack {
                if let rating = hotel.guestRating {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.white)
                            Text(String(format: "%.1f", rating))
                                .font(AppTypography.headline)
                                .foregroundColor(.white)
                        }
                        if let reviews = hotel.reviewCount {
                            Text("\(reviews) đánh giá")
                                .font(AppTypography.caption1)
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                    .padding(AppSpacing.sm)
                    .background(.ultraThinMaterial)
                    .cornerRadius(AppSpacing.radiusSmall)
                }

                Spacer()

                if let stars = hotel.starRating {
                    StarBadge(stars: stars)
                }
            }
            .padding(AppSpacing.base)
        }
        .frame(height: 250)
        .clipped()
    }

    private var imagePlaceholder: some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [AppColors.backgroundTertiary, AppColors.backgroundSecondary],
                startPoint: .top,
                endPoint: .bottom
            ))
            .overlay(
                Image(systemName: "building.2.fill")
                    .font(.system(size: 60))
                    .foregroundColor(AppColors.textTertiary)
            )
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(hotel.name)
                .font(AppTypography.title1)
                .foregroundColor(AppColors.textPrimary)

            if hotel.guestRating == nil {
                Text("Chưa có đánh giá")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack {
                if let stars = hotel.starRating {
                    HStack(spacing: 4) {
                        ForEach(0..<stars, id: \.self) { _ in
                            Image(systemName: "star.fill")
                                .foregroundColor(AppColors.starYellow)
                                .font(.system(size: 14))
                        }
                    }
                }
            }
        }
    }

    private var locationSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            SectionHeader(title: "Địa điểm")

            HStack(spacing: AppSpacing.md) {
                Image(systemName: "location.fill")
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.locationRed)
                    .frame(width: 32, height: 32)
                    .background(AppColors.locationRed.opacity(0.1))
                    .cornerRadius(AppSpacing.radiusSmall)

                VStack(alignment: .leading, spacing: 2) {
                    Text(hotel.address)
                        .font(AppTypography.body)
                        .foregroundColor(AppColors.textPrimary)

                    Text(hotel.city)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
    }

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            SectionHeader(title: "Mô tả")

            Text(hotel.description)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textSecondary)
                .lineSpacing(4)
        }
    }

    private func amenitiesSection(_ amenities: [String]) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Tiện ích")

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    ForEach(amenities, id: \.self) { amenity in
                        AmenityBadge(amenity: amenity)
                    }
                }
                .padding(.horizontal, 1)
            }
        }
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            HStack {
                SectionHeader(title: "Đánh giá")
                Spacer()
                NavigationLink { HotelReviewsView(hotel: hotel) } label: {
                    Text("Xem tất cả")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.primary)
                }
            }

            if isLoadingReviews {
                HStack {
                    ProgressView()
                    Text("Đang tải đánh giá...")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.xl)
            } else if reviews.isEmpty {
                VStack(spacing: AppSpacing.sm) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 40))
                        .foregroundColor(AppColors.textTertiary)
                    Text("Chưa có đánh giá nào")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.xl)
            } else {
                ForEach(reviews.prefix(3)) { review in
                    ReviewCardItemView(review: review)
                }
            }
        }
    }

    private var policiesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Chính sách")

            PolicyRow(icon: "clock", title: "Nhận phòng", value: hotel.checkInTime ?? "Liên hệ khách sạn")
            PolicyRow(icon: "clock.badge.checkmark", title: "Trả phòng", value: hotel.checkOutTime ?? "Liên hệ khách sạn")
        }
    }

    private var bookButtonSection: some View {
        VStack(spacing: AppSpacing.sm) {
            PrimaryButton(title: "Đặt phòng ngay") {
                showBooking = true
            }

            Text("Miễn phí hủy phòng trong 24 giờ")
                .font(AppTypography.caption1)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(.top, AppSpacing.base)
    }

    // MARK: - Actions
    private func loadReviews() async {
        do {
            let response = try await ReviewService.shared.getReviews(hotelId: hotel.id)
            reviews = response.reviews
        } catch {
            // Silent fail
        }
        isLoadingReviews = false
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(AppTypography.headline)
            .foregroundColor(AppColors.textPrimary)
    }
}

// MARK: - Policy Row
struct PolicyRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(AppColors.primary)
                .frame(width: 24)

            Text(title)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textSecondary)

            Spacer()

            Text(value)
                .font(AppTypography.bodyMedium)
                .foregroundColor(AppColors.textPrimary)
        }
        .padding(AppSpacing.base)
        .background(AppColors.backgroundSecondary)
        .cornerRadius(AppSpacing.radiusSmall)
    }
}
