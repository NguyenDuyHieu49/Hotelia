import SwiftUI

// MARK: - App Typography
struct AppTypography {
    // Large Title
    static let largeTitle = Font.system(size: 34, weight: .bold, design: .default)
    static let largeTitle2 = Font.system(size: 28, weight: .bold, design: .default)

    // Title
    static let title1 = Font.system(size: 22, weight: .bold, design: .default)
    static let title2 = Font.system(size: 20, weight: .semibold, design: .default)
    static let title3 = Font.system(size: 18, weight: .semibold, design: .default)

    // Headline
    static let headline = Font.system(size: 17, weight: .semibold, design: .default)
    static let headlineMedium = Font.system(size: 17, weight: .medium, design: .default)

    // Body
    static let body = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyBold = Font.system(size: 17, weight: .semibold, design: .default)
    static let bodyMedium = Font.system(size: 17, weight: .medium, design: .default)

    // Callout
    static let callout = Font.system(size: 16, weight: .regular, design: .default)
    static let calloutMedium = Font.system(size: 16, weight: .medium, design: .default)

    // Subheadline
    static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
    static let subheadlineMedium = Font.system(size: 15, weight: .medium, design: .default)

    // Footnote
    static let footnote = Font.system(size: 13, weight: .regular, design: .default)
    static let footnoteMedium = Font.system(size: 13, weight: .medium, design: .default)

    // Caption
    static let caption1 = Font.system(size: 12, weight: .regular, design: .default)
    static let caption1Medium = Font.system(size: 12, weight: .medium, design: .default)
    static let caption1Bold = Font.system(size: 12, weight: .bold, design: .default)
    static let caption2 = Font.system(size: 11, weight: .regular, design: .default)
    static let caption2Bold = Font.system(size: 11, weight: .bold, design: .default)

    // Price
    static let priceLarge = Font.system(size: 28, weight: .bold, design: .default)
    static let priceMedium = Font.system(size: 20, weight: .semibold, design: .default)
    static let priceSmall = Font.system(size: 16, weight: .semibold, design: .default)
}

// MARK: - View Modifiers for Typography
struct AppTextStyles: ViewModifier {
    enum Style {
        case largeTitle, title1, title2, title3
        case headline, headlineMedium
        case body, bodyBold, bodyMedium
        case callout, calloutMedium
        case subheadline, subheadlineMedium
        case footnote, footnoteMedium
        case caption1, caption1Medium, caption2
    }

    let style: Style

    func body(content: Content) -> some View {
        content.font(font(for: style))
    }

    private func font(for style: Style) -> Font {
        switch style {
        case .largeTitle: return AppTypography.largeTitle
        case .title1: return AppTypography.title1
        case .title2: return AppTypography.title2
        case .title3: return AppTypography.title3
        case .headline: return AppTypography.headline
        case .headlineMedium: return AppTypography.headlineMedium
        case .body: return AppTypography.body
        case .bodyBold: return AppTypography.bodyBold
        case .bodyMedium: return AppTypography.bodyMedium
        case .callout: return AppTypography.callout
        case .calloutMedium: return AppTypography.calloutMedium
        case .subheadline: return AppTypography.subheadline
        case .subheadlineMedium: return AppTypography.subheadlineMedium
        case .footnote: return AppTypography.footnote
        case .footnoteMedium: return AppTypography.footnoteMedium
        case .caption1: return AppTypography.caption1
        case .caption1Medium: return AppTypography.caption1Medium
        case .caption2: return AppTypography.caption2
        }
    }
}

extension View {
    func textStyle(_ style: AppTextStyles.Style) -> some View {
        modifier(AppTextStyles(style: style))
    }
}
