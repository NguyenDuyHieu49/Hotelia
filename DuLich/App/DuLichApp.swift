import SwiftUI

@main
struct DuLichApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.system.rawValue

    var body: some Scene {
        WindowGroup {
            if authViewModel.isLoggedIn {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environment(\.locale, (AppLanguage(rawValue: appLanguage) ?? .system).locale)
            } else {
                WelcomeView()
                    .environmentObject(authViewModel)
                    .environment(\.locale, (AppLanguage(rawValue: appLanguage) ?? .system).locale)
            }
        }
    }
}
