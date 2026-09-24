//
//  DestinationChip.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct DestinationChip: View {

    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {

            Text(title)
                .font(
                    .subheadline.weight(
                        isSelected
                        ? .semibold
                        : .medium
                    )
                )
                .foregroundStyle(
                    isSelected
                    ? .white
                    : .primary
                )
                .padding(.horizontal, 16)
                .frame(height: 40)
                .background(
                    isSelected
                    ? Color.blue
                    : Color.white
                )
                .clipShape(Capsule())
                .overlay {
                    if !isSelected {
                        Capsule()
                            .stroke(
                                Color.gray.opacity(0.15),
                                lineWidth: 1
                            )
                    }
                }
        }
    }
}
