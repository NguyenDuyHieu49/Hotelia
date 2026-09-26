//
//  ExploreSearchSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreSearchSection: View {

    @Binding var searchText: String
    let filters: HotelSearchFilters

    let onSearch: () -> Void
    let onFilter: () -> Void

    private var dateLabel: String {
        guard let start = filters.checkIn, let end = filters.checkOut else { return "Ngày" }
        return "\(start.suffix(5).replacingOccurrences(of: "-", with: "/"))–\(end.suffix(5).replacingOccurrences(of: "-", with: "/"))"
    }

    private var extraFilterCount: Int {
        [filters.minPrice != nil, filters.maxPrice != nil, filters.minRating != nil].filter { $0 }.count
    }

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
                    title: dateLabel, isActive: filters.checkIn != nil, action: onFilter
                )

                SearchFilterButton(
                    icon: "person.2",
                    title: "\(filters.guests) khách", isActive: filters.guests > 1, action: onFilter
                )

                SearchFilterButton(
                    icon: "slider.horizontal.3",
                    title: extraFilterCount > 0 ? "Lọc (\(extraFilterCount))" : "Bộ lọc",
                    isActive: extraFilterCount > 0, action: onFilter
                )
            }
        }
    }
}

private struct SearchFilterButton: View {

    let icon: String
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button {
            action()
        } label: {
            HStack(spacing: 6) {

                Image(systemName: icon)
                    .font(.caption)

                Text(title)
                    .font(.caption.weight(.medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundStyle(isActive ? Color.blue : Color.primary)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .background(isActive ? Color.blue.opacity(0.12) : Color(.secondarySystemGroupedBackground))
            .clipShape(Capsule())
        }
        .accessibilityValue(isActive ? "Đang áp dụng" : "Chưa áp dụng")
    }
}
