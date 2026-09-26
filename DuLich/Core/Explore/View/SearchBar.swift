import SwiftUI

// Legacy entry point routes to the complete Explore search and filters.
struct SearchBar: View {
    var body: some View {
        NavigationLink { ExploreView() } label: {
            Label("Tìm kiếm khách sạn", systemImage: "magnifyingglass")
                .frame(maxWidth: .infinity, alignment: .leading).padding()
                .background(.regularMaterial, in: Capsule())
        }
    }
}
