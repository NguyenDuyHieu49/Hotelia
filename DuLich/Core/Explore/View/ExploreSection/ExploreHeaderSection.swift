//
//  ExploreHeaderSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreHeaderSection: View {

    var body: some View {
        HStack(alignment: .center) {

            VStack(alignment: .leading, spacing: 5) {

                Text("Xin chào 👋")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text("Khám phá")
                    .font(.system(size: 30, weight: .bold))

                Text("Tìm nơi lưu trú phù hợp cho chuyến đi của bạn")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            NavigationLink {
                NotificationsView()
            } label: {
                Image(systemName: "bell")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .background(.white)
                    .clipShape(Circle())
                    .shadow(
                        color: .black.opacity(0.06),
                        radius: 8,
                        y: 3
                    )
            }
        }
    }
}
