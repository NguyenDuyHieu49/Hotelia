//
//  ExploreLoadingSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreLoadingSection: View {

    let isRanking: Bool

    var body: some View {

        VStack(spacing: 16) {

            ProgressView()
                .scaleEffect(1.2)

            Text(
                isRanking
                ? "AI đang tìm khách sạn phù hợp..."
                : "Đang tải khách sạn..."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .frame(
            maxWidth: .infinity
        )
        .padding(.vertical, 80)
    }
}


struct ExploreEmptySection: View {

    var body: some View {

        VStack(spacing: 12) {

            Image(
                systemName:
                    "building.2"
            )
            .font(
                .system(size: 42)
            )
            .foregroundStyle(
                .secondary
            )

            Text(
                "Không tìm thấy khách sạn"
            )
            .font(.headline)

            Text(
                "Hãy thử tìm kiếm một địa điểm khác."
            )
            .font(.subheadline)
            .foregroundStyle(
                .secondary
            )
        }
        .frame(
            maxWidth: .infinity
        )
        .padding(.vertical, 80)
    }
}


struct ExploreErrorSection: View {

    let message: String
    let onRetry: () -> Void

    var body: some View {

        VStack(spacing: 14) {

            Image(
                systemName:
                    "exclamationmark.triangle"
            )
            .font(
                .system(size: 40)
            )
            .foregroundStyle(
                .orange
            )

            Text(message)
                .font(.headline)

            Button(
                "Thử lại",
                action: onRetry
            )
            .buttonStyle(
                .borderedProminent
            )
        }
        .frame(
            maxWidth: .infinity
        )
        .padding(.vertical, 60)
    }
}
