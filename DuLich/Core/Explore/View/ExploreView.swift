import SwiftUI

struct ExploreView: View {
    @StateObject private var viewModel = ExploreViewModel()
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                SearchBarView(text: $searchText) {
                    Task {
                        await viewModel.searchHotels(destination: searchText)
                    }
                }
                .padding(.horizontal, AppSpacing.base)
                .padding(.vertical, AppSpacing.md)

                // ML Ranking Indicator
                if viewModel.isRanking {
                    RankingIndicatorView(info: viewModel.rankingInfo ?? "Đang xếp hạng...")
                }

                // Content
                if viewModel.isLoading && viewModel.hotels.isEmpty {
                    LoadingView(message: "Đang tải khách sạn...")
                } else if let error = viewModel.errorMessage, viewModel.hotels.isEmpty {
                    ErrorView(message: error) {
                        Task { await viewModel.loadHotels() }
                    }
                } else if viewModel.hotels.isEmpty {
                    EmptyStateView(
                        icon: "building.2",
                        title: "Không tìm thấy",
                        message: "Không có khách sạn nào phù hợp với tìm kiếm của bạn"
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.base) {
                            ForEach(Array(viewModel.hotels.enumerated()), id: \.element.id) { index, hotel in
                                NavigationLink(destination: HotelDetailView(hotel: hotel)) {
                                    RankedHotelCardView(hotel: hotel, rank: index + 1)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, AppSpacing.base)
                        .padding(.vertical, AppSpacing.md)
                    }
                    .refreshable {
                        await viewModel.refreshRanking()
                    }
                }
            }
            .background(AppColors.backgroundSecondary)
            .navigationTitle("Khám phá")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.isRanking {
                        Image(systemName: "brain")
                            .foregroundColor(.blue)
                    } else {
                        Button(action: {
                            Task { await viewModel.refreshRanking() }
                        }) {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .task {
                if viewModel.hotels.isEmpty {
                    await viewModel.loadHotels()
                }
            }
        }
    }
}

// MARK: - Ranking Indicator
struct RankingIndicatorView: View {
    let info: String

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            ProgressView()
                .scaleEffect(0.8)
            Text(info)
                .font(AppTypography.caption1)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(.horizontal, AppSpacing.base)
        .padding(.vertical, AppSpacing.sm)
        .background(Color.blue.opacity(0.1))
    }
}

// MARK: - Ranked Hotel Card
struct RankedHotelCardView: View {
    let hotel: Hotel
    let rank: Int

    var body: some View {
        HStack(spacing: 0) {
            // Rank Badge
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 32, height: 32)

                Text("\(rank)")
                    .font(AppTypography.caption1Bold)
                    .foregroundColor(.white)
            }
            .padding(.trailing, AppSpacing.md)

            // Hotel Info
            ExpandedHotelCardView(hotel: hotel)
        }
        .padding(AppSpacing.base)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 6, x: 0, y: 3)
    }

    private var rankColor: Color {
        switch rank {
        case 1: return AppColors.goldBadge
        case 2: return AppColors.silverBadge
        case 3: return AppColors.bronzeBadge
        default: return AppColors.primaryBlue
        }
    }
}

// MARK: - Expanded Hotel Card
struct ExpandedHotelCardView: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            // Name
            Text(hotel.name)
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)
                .lineLimit(1)

            // Location
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "location.fill")
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.locationRed)
                Text("\(hotel.city)")
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
            }

            // Rating
            HStack(spacing: AppSpacing.sm) {
                if let rating = hotel.averageRating {
                    RatingView(rating: rating, starSize: 12)
                }
                if let reviews = hotel.reviewCount {
                    Text("(\(reviews) đánh giá)")
                        .font(AppTypography.caption1)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
    }
}

// MARK: - Search Bar
struct SearchBarView: View {
    @Binding var text: String
    var onSubmit: () -> Void

    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.textSecondary)

            TextField("Tìm kiếm khách sạn...", text: $text)
                .font(AppTypography.body)
                .onSubmit {
                    onSubmit()
                }

            if !text.isEmpty {
                Button(action: {
                    text = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(AppColors.textTertiary)
                }
            }
        }
        .padding(.horizontal, AppSpacing.base)
        .frame(height: AppDimensions.inputLarge)
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Hotel Card View
struct HotelCardView: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image Section
            ZStack(alignment: .topTrailing) {
                // Hotel Image
                if let images = hotel.images, !images.isEmpty, let firstImage = images.first {
                    AsyncImage(url: URL(string: firstImage)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure(_):
                            hotelImagePlaceholder
                        case .empty:
                            hotelImagePlaceholder
                                .overlay(ProgressView())
                        @unknown default:
                            hotelImagePlaceholder
                        }
                    }
                } else {
                    hotelImagePlaceholder
                }

                // Star Badge
                if let stars = hotel.starRating {
                    StarBadge(stars: stars)
                        .padding(AppSpacing.sm)
                }
            }
            .frame(height: 160)
            .clipped()
            .cornerRadius(AppSpacing.radiusMedium, corners: [.topLeft, .topRight])

            // Info Section
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                // Name
                Text(hotel.name)
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)

                // Location
                HStack(spacing: AppSpacing.xs) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.locationRed)
                    Text("\(hotel.city)")
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                        .lineLimit(1)
                }

                // Rating & Reviews
                HStack(spacing: AppSpacing.sm) {
                    if let rating = hotel.averageRating {
                        RatingView(rating: rating, starSize: 12)
                    }

                    if let reviews = hotel.reviewCount {
                        Text("(\(reviews) đánh giá)")
                            .font(AppTypography.caption1)
                            .foregroundColor(AppColors.textSecondary)
                    }

                    Spacer()
                }

                // Amenities Horizontal Scroll
                if let amenities = hotel.amenities, !amenities.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: AppSpacing.xs) {
                            ForEach(amenities.prefix(6), id: \.self) { amenity in
                                AmenityBadge(amenity: amenity)
                            }
                        }
                    }
                }
            }
            .padding(AppSpacing.base)
        }
        .background(Color.white)
        .cornerRadius(AppSpacing.radiusMedium)
        .shadow(color: AppColors.cardShadow, radius: 6, x: 0, y: 3)
    }

    private var hotelImagePlaceholder: some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [AppColors.backgroundTertiary, AppColors.backgroundSecondary],
                startPoint: .top,
                endPoint: .bottom
            ))
            .overlay(
                Image(systemName: "building.2.fill")
                    .font(.system(size: 40))
                    .foregroundColor(AppColors.textTertiary)
            )
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
