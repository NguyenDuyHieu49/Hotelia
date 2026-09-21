import SwiftUI

// MARK: - Primary Button
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                }
                Text(title)
                    .font(AppTypography.headline)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppDimensions.buttonLarge)
            .background(isDisabled ? AppColors.textTertiary : AppColors.primary)
            .foregroundColor(.white)
            .cornerRadius(AppSpacing.radiusMedium)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Secondary Button
struct SecondaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary))
                        .scaleEffect(0.8)
                }
                Text(title)
                    .font(AppTypography.headline)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppDimensions.buttonLarge)
            .background(AppColors.backgroundSecondary)
            .foregroundColor(isDisabled ? AppColors.textTertiary : AppColors.primary)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(isDisabled ? AppColors.textTertiary : AppColors.primary, lineWidth: 1.5)
            )
            .cornerRadius(AppSpacing.radiusMedium)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - App Text Field
struct AppTextField: View {
    let placeholder: String
    @Binding var text: String
    var icon: String? = nil
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    var errorMessage: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.xs) {
            HStack(spacing: AppSpacing.md) {
                if let icon = icon {
                    Image(systemName: icon)
                        .foregroundColor(AppColors.textSecondary)
                        .frame(width: 20)
                }

                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboardType)
                }
            }
            .padding(.horizontal, AppSpacing.base)
            .frame(height: AppDimensions.inputLarge)
            .background(AppColors.backgroundSecondary)
            .cornerRadius(AppSpacing.radiusMedium)
            .overlay(
                RoundedRectangle(cornerRadius: AppSpacing.radiusMedium)
                    .stroke(errorMessage != nil ? AppColors.error : Color.clear, lineWidth: 1)
            )

            if let error = errorMessage {
                Text(error)
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.error)
            }
        }
    }
}

// MARK: - Rating View
struct RatingView: View {
    let rating: Double
    let maxRating: Int = 5
    var showNumber: Bool = true
    var starSize: CGFloat = 14

    var body: some View {
        HStack(spacing: AppSpacing.xxs) {
            ForEach(0..<maxRating, id: \.self) { index in
                Image(systemName: starIcon(for: index))
                    .foregroundColor(AppColors.starYellow)
                    .font(.system(size: starSize))
            }
            if showNumber {
                Text(String(format: "%.1f", rating))
                    .font(AppTypography.subheadlineMedium)
                    .foregroundColor(AppColors.textPrimary)
            }
        }
    }

    private func starIcon(for index: Int) -> String {
        let threshold = Double(index) + 0.5
        if rating >= Double(index + 1) {
            return "star.fill"
        } else if rating >= threshold {
            return "star.leadinghalf.filled"
        } else {
            return "star"
        }
    }
}

// MARK: - Location Badge
struct LocationBadge: View {
    let city: String
    var district: String? = nil

    var body: some View {
        HStack(spacing: AppSpacing.xxs) {
            Image(systemName: "location.fill")
                .font(.system(size: 12))
                .foregroundColor(AppColors.locationRed)

            Text(district != nil ? "\(district!), \(city)" : city)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
                .lineLimit(1)
        }
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xs)
        .background(AppColors.backgroundSecondary)
        .cornerRadius(AppSpacing.radiusSmall)
    }
}

// MARK: - Price Tag
struct PriceTag: View {
    let price: Int
    var originalPrice: Int? = nil
    var suffix: String = "đêm"

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(formatPrice(price))
                    .font(AppTypography.priceMedium)
                    .foregroundColor(AppColors.primary)

                Text("/\(suffix)")
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textSecondary)
            }

            if let original = originalPrice, original > price {
                Text(formatPrice(original))
                    .font(AppTypography.caption1)
                    .foregroundColor(AppColors.textTertiary)
                    .strikethrough()
            }
        }
    }

    private func formatPrice(_ price: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = ""
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "\(price)"
    }
}

// MARK: - Amenity Badge
struct AmenityBadge: View {
    let amenity: String
    var compact: Bool = false

    var body: some View {
        HStack(spacing: AppSpacing.xxs) {
            Image(systemName: iconName)
                .font(.system(size: compact ? 10 : 12))
            if !compact {
                Text(amenity.capitalized)
                    .font(AppTypography.caption1)
            }
        }
        .foregroundColor(AppColors.textSecondary)
        .padding(.horizontal, compact ? AppSpacing.xs : AppSpacing.sm)
        .padding(.vertical, AppSpacing.xxs)
        .background(AppColors.backgroundSecondary)
        .cornerRadius(AppSpacing.radiusSmall)
    }

    private var iconName: String {
        switch amenity.lowercased() {
        case "wifi": return "wifi"
        case "pool": return "figure.pool.swim"
        case "parking": return "car.fill"
        case "gym", "fitness": return "dumbbell.fill"
        case "spa": return "sparkles"
        case "restaurant": return "fork.knife"
        case "ac", "air_conditioning": return "air.conditioner.horizontal.fill"
        case "tv": return "tv"
        case "minibar": return "wineglass"
        case "laundry": return "washer.fill"
        case "room_service": return "bell.fill"
        case "bar": return "wineglass.fill"
        case "beach_access": return "beach.umbrella.fill"
        case "balcony": return "door.left.hand.open"
        case "ocean_view": return "water.waves"
        default: return "checkmark.circle"
        }
    }
}

// MARK: - Star Rating Badge
struct StarBadge: View {
    let stars: Int

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<stars, id: \.self) { _ in
                Image(systemName: "star.fill")
                    .foregroundColor(.white)
                    .font(.system(size: 10))
            }
        }
        .padding(.horizontal, AppSpacing.sm)
        .padding(.vertical, AppSpacing.xxs)
        .background(AppColors.primary)
        .cornerRadius(AppSpacing.radiusSmall)
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(statusText)
            .font(AppTypography.caption1Medium)
            .foregroundColor(statusColor)
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .background(statusColor.opacity(0.15))
            .cornerRadius(AppSpacing.radiusSmall)
    }

    private var statusText: String {
        switch status {
        case "PENDING_PAYMENT": return "Chờ thanh toán"
        case "PAID": return "Đã thanh toán"
        case "CONFIRMED": return "Đã xác nhận"
        case "CHECKED_IN": return "Đã nhận phòng"
        case "CHECKED_OUT": return "Đã trả phòng"
        case "COMPLETED": return "Hoàn thành"
        case "CANCELLED": return "Đã hủy"
        case "REFUNDED": return "Đã hoàn tiền"
        case "PUBLISHED": return "Đang hoạt động"
        case "PENDING_APPROVAL": return "Chờ duyệt"
        case "DRAFT": return "Bản nháp"
        case "REJECTED": return "Bị từ chối"
        default: return status
        }
    }

    private var statusColor: Color {
        switch status {
        case "COMPLETED", "PUBLISHED": return AppColors.success
        case "CANCELLED", "REFUNDED", "REJECTED": return AppColors.error
        case "PENDING_PAYMENT", "PENDING_APPROVAL": return AppColors.warning
        case "PAID", "CONFIRMED": return AppColors.info
        case "CHECKED_IN", "CHECKED_OUT": return AppColors.secondary
        default: return AppColors.textSecondary
        }
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var message: String = "Đang tải..."

    var body: some View {
        VStack(spacing: AppSpacing.base) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: AppColors.primary))
                .scaleEffect(1.5)
            Text(message)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(AppColors.textTertiary)

            VStack(spacing: AppSpacing.sm) {
                Text(title)
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.textPrimary)

                Text(message)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle = actionTitle, let action = action {
                PrimaryButton(title: actionTitle, action: action)
                    .frame(width: 200)
            }
        }
        .padding(AppSpacing.xxl)
    }
}

// MARK: - Error View
struct ErrorView: View {
    let message: String
    var retryAction: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(AppColors.warning)

            VStack(spacing: AppSpacing.sm) {
                Text("Oops!")
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.textPrimary)

                Text(message)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let retry = retryAction {
                PrimaryButton(title: "Thử lại", action: retry)
                    .frame(width: 160)
            }
        }
        .padding(AppSpacing.xxl)
    }
}
