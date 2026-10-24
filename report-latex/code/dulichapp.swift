import SwiftUI

@main
struct DuLichApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.system.rawValue

    // AppAuth's ASWebAuthenticationSession completes the Google OAuth callback itself.
    // Forwarding /oauth2callback through onOpenURL resumes that completed session twice and crashes.

    var body: some Scene {
        WindowGroup {
            if authViewModel.isLoggedIn {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environment(\.locale, (AppLanguage(rawValue: appLanguage) ?? .system).locale)
                    // L10n.text reads the language when a view renders; a new identity
                    // re-renders every screen instead of leaving earlier text untranslated.
                    .id(appLanguage)
            } else {
                WelcomeView()
                    .environmentObject(authViewModel)
                    .environment(\.locale, (AppLanguage(rawValue: appLanguage) ?? .system).locale)
                    .id(appLanguage)
            }
        }
    }
}
