import Foundation

enum ReviewModerationError: LocalizedError {
    case profanity
    case tooShort
    case tooLong
    case spam

    var errorDescription: String? {
        switch self {
        case .profanity:
            return L10n.text("review_moderation_profanity")
        case .tooShort:
            return L10n.text("review_moderation_too_short")
        case .tooLong:
            return L10n.text("review_moderation_too_long")
        case .spam:
            return L10n.text("review_moderation_spam")
        }
    }
}

final class ReviewContentModerator {
    static let shared = ReviewContentModerator()
    private init() {}

    private let minLength = 3
    private let maxLength = 1000

    private let blockedWords: [String] = [
        "địt", "dit", "đụ", "du", "đéo", "deo", "đĩ", "di", "lồn", "lon", "cặc", "cac", "buồi", "buoi",
        "đm", "dm", "clgt", "clmm", "vcl", "vkl", "vl", "cc", "đmm", "dmm", "ngu", "chó", "cho", "điên", "dien",
        "fuck", "fck", "shit", "bitch", "asshole", "damn", "cunt", "dick", "pussy", "bastard", "whore",
        "slut", "nigger", "faggot", "retard", "stupid", "idiot", "suck", "sex", "porn", "xxx"
    ]

    func validate(_ text: String) throws {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= minLength else { throw ReviewModerationError.tooShort }
        guard trimmed.count <= maxLength else { throw ReviewModerationError.tooLong }
        guard !hasExcessiveRepeats(trimmed) else { throw ReviewModerationError.spam }

        let normalized = normalize(trimmed)
        for word in blockedWords {
            let normalizedWord = normalize(word)
            guard !normalizedWord.isEmpty else { continue }
            if containsToken(normalized, token: normalizedWord) {
                throw ReviewModerationError.profanity
            }
        }
    }

    private func normalize(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .lowercased()
            .replacingOccurrences(of: "đ", with: "d")
            .replacingOccurrences(of: "Đ", with: "d")
    }

    private func containsToken(_ text: String, token: String) -> Bool {
        guard text.contains(token) else { return false }
        let pattern = "(?:^|[^a-z0-9])\(NSRegularExpression.escapedPattern(for: token))(?:[^a-z0-9]|$)"
        return text.range(of: pattern, options: .regularExpression) != nil
            || text == token
    }

    private func hasExcessiveRepeats(_ text: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: "(.)\\1{4,}", options: [.caseInsensitive]) else {
            return false
        }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        return regex.firstMatch(in: text, options: [], range: range) != nil
    }
}
