import Foundation
import Security

/// Stores authentication credentials in the iOS Keychain.
/// Non-sensitive profile and language preferences remain in UserDefaults.
final class SecureTokenStore {
    static let shared = SecureTokenStore()

    enum Token: String {
        case access = "accessToken"
        case refresh = "refreshToken"
    }

    private let service = Bundle.main.bundleIdentifier ?? "com.hotelia.auth"

    private init() {
        migrateLegacyTokens()
    }

    func value(for token: Token) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: token.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    func set(_ value: String, for token: Token) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: token.rawValue,
        ]
        let attributes: [String: Any] = [kSecValueData as String: data]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecSuccess { return true }
        guard status == errSecItemNotFound else { return false }

        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }

    func remove(_ token: Token) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: token.rawValue,
        ]
        SecItemDelete(query as CFDictionary)
    }

    func removeAll() {
        remove(.access)
        remove(.refresh)
    }

    private func migrateLegacyTokens() {
        for token in [Token.access, Token.refresh] {
            if value(for: token) == nil,
               let legacy = UserDefaults.standard.string(forKey: token.rawValue),
               !legacy.isEmpty {
                _ = set(legacy, for: token)
            }
            UserDefaults.standard.removeObject(forKey: token.rawValue)
        }
    }
}
