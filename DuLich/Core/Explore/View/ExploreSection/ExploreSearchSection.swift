//
//  ExploreSearchSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreSearchSection: View {

    @Binding var searchText: String

    let onSearch: () -> Void

    var body: some View {
        VStack(spacing: 12) {

            HStack(spacing: 12) {

                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)

                TextField(
                    "Bạn muốn đến đâu?",
                    text: $searchText
                )
                .submitLabel(.search)
                .onSubmit {
                    onSearch()
                }

                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                        onSearch()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 56)
            .background(.white)
            .clipShape(
                RoundedRectangle(cornerRadius: 18)
            )
            .shadow(
                color: .black.opacity(0.05),
                radius: 12,
                y: 5
            )

            HStack(spacing: 10) {

                SearchFilterButton(
                    icon: "calendar",
                    title: "Ngày"
                )

                SearchFilterButton(
                    icon: "person.2",
                    title: "Khách"
                )

                SearchFilterButton(
                    icon: "slider.horizontal.3",
                    title: "Bộ lọc"
                )
            }
        }
    }
}

private struct SearchFilterButton: View {

    let icon: String
    let title: String

    var body: some View {
        Button {
            // TODO: Search filter
        } label: {
            HStack(spacing: 6) {

                Image(systemName: icon)
                    .font(.caption)

                Text(title)
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(.white)
            .clipShape(Capsule())
        }
    }
}
