//
//  ExploreDestinationSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExploreDestinationSection: View {

    let destinations: [String]

    @Binding var selectedDestination: String

    let onSelect: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            HStack {
                Text("Điểm đến phổ biến")
                    .font(.title3.weight(.bold))

                Spacer()

                Button("Xem tất cả") {
                    // TODO
                }
                .font(.caption.weight(.medium))
                .foregroundStyle(.blue)
            }

            ScrollView(
                .horizontal,
                showsIndicators: false
            ) {
                HStack(spacing: 10) {

                    ForEach(
                        destinations,
                        id: \.self
                    ) { destination in

                        DestinationChip(
                            title: destination,
                            isSelected:
                                selectedDestination == destination
                        ) {
                            onSelect(destination)
                        }
                    }
                }
            }
        }
    }
}
