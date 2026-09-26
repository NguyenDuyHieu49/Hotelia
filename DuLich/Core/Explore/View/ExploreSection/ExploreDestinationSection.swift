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
    @State private var showAllDestinations = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            HStack {
                Text("Điểm đến phổ biến")
                    .font(.title3.weight(.bold))

                Spacer()

                Button("Xem tất cả") {
                    showAllDestinations = true
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
        .sheet(isPresented: $showAllDestinations) {
            NavigationStack {
                List(destinations, id: \.self) { destination in
                    Button {
                        onSelect(destination)
                        showAllDestinations = false
                    } label: {
                        HStack {
                            Text(destination)
                                .foregroundStyle(.primary)
                            Spacer()
                            if selectedDestination == destination {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.blue)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                .navigationTitle("Tất cả điểm đến")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Đóng") { showAllDestinations = false }
                    }
                }
            }
        }
    }
}
