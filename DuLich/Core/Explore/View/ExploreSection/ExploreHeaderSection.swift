import SwiftUI

struct ExploreHeaderSection: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("HOTELIA / KHÁM PHÁ")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(Color(red: 0.11, green: 0.39, blue: 0.43))
                Text("Chọn nơi ở cho\nchuyến đi này.")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .tracking(-0.8)
                    .lineSpacing(-2)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Từ thành phố quen đến vùng biển mới.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            NavigationLink {
                NotificationsView()
            } label: {
                Image(systemName: "bell")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .background(Color(.secondarySystemGroupedBackground), in: Circle())
            }
            .accessibilityLabel("Thông báo")
        }
    }
}
