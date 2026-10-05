import Foundation

enum AppLanguage: String, CaseIterable, Identifiable {
    case system
    case vietnamese = "vi"
    case english = "en"

    var id: String { rawValue }

    static var selected: AppLanguage {
        AppLanguage(rawValue: UserDefaults.standard.string(forKey: "appLanguage") ?? "system") ?? .system
    }

    static var isEnglishSelected: Bool {
        selected.locale.language.languageCode?.identifier == "en"
    }

    var locale: Locale {
        self == .system ? .autoupdatingCurrent : Locale(identifier: rawValue)
    }
}

enum L10n {
    static func text(_ key: String) -> String {
        let selected = AppLanguage.selected
        let bundle: Bundle
        if selected != .system,
           let path = Bundle.main.path(forResource: selected.rawValue, ofType: "lproj"),
           let localizedBundle = Bundle(path: path) {
            bundle = localizedBundle
        } else {
            bundle = .main
        }
        return NSLocalizedString(key, tableName: "Localizable", bundle: bundle, value: key, comment: "")
    }

    static func format(_ key: String, _ arguments: CVarArg...) -> String {
        return String(format: text(key), locale: AppLanguage.selected.locale, arguments: arguments)
    }
}
