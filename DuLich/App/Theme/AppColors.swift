import SwiftUI

// MARK: - App Color Palette
struct AppColors {
    // Primary Colors
    static let primary = Color(hex: "007AFF")
    static let primaryDark = Color(hex: "0056B3")
    static let primaryLight = Color(hex: "5AC8FA")

    // Secondary Colors
    static let secondary = Color(hex: "5856D6")
    static let secondaryDark = Color(hex: "3634A3")
    static let secondaryLight = Color(hex: "AEA1FF")

    // Accent Colors
    static let accent = Color(hex: "FF9500")
    static let accentGreen = Color(hex: "34C759")
    static let accentRed = Color(hex: "FF3B30")
    static let accentYellow = Color(hex: "FFCC00")

    // Background Colors
    static let backgroundPrimary = Color(hex: "FFFFFF")
    static let backgroundSecondary = Color(hex: "F2F2F7")
    static let backgroundTertiary = Color(hex: "E5E5EA")
    static let backgroundDark = Color(hex: "1C1C1E")

    // Text Colors
    static let textPrimary = Color(hex: "000000")
    static let textSecondary = Color(hex: "8E8E93")
    static let textTertiary = Color(hex: "C7C7CC")
    static let textInverse = Color(hex: "FFFFFF")

    // Status Colors
    static let success = Color(hex: "34C759")
    static let warning = Color(hex: "FF9500")
    static let error = Color(hex: "FF3B30")
    static let info = Color(hex: "007AFF")

    // Border & Divider
    static let border = Color(hex: "C6C6C8")
    static let divider = Color(hex: "E5E5EA")

    // Card Colors
    static let cardBackground = Color(hex: "FFFFFF")
    static let cardShadow = Color.black.opacity(0.08)

    // Rating Star
    static let starYellow = Color(hex: "FFCC00")

    // Location Pin
    static let locationRed = Color(hex: "FF3B30")

    // ML Ranking
    static let primaryBlue = Color(hex: "007AFF")
    static let goldBadge = Color(hex: "FFD700")
    static let silverBadge = Color(hex: "C0C0C0")
    static let bronzeBadge = Color(hex: "CD7F32")
}

// MARK: - Color Extension for Hex
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Gradient Definitions
struct AppGradients {
    static let primary = LinearGradient(
        colors: [AppColors.primary, AppColors.primaryDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let secondary = LinearGradient(
        colors: [AppColors.secondary, AppColors.secondaryDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let accent = LinearGradient(
        colors: [AppColors.accent, Color(hex: "FF6B00")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let card = LinearGradient(
        colors: [Color.white, Color(hex: "F8F8F8")],
        startPoint: .top,
        endPoint: .bottom
    )
}
