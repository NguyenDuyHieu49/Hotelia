//
//  ExplorePromotionSection.swift
//  Hotelia
//
//  Created by Macbook Pro on 24/9/26.
//

import SwiftUI

struct ExplorePromotionSection: View {

    var body: some View {

        ZStack {

            RoundedRectangle(
                cornerRadius: 24
            )
            .fill(
                LinearGradient(
                    colors: [
                        Color.blue,
                        Color.indigo
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )

            HStack {

                VStack(
                    alignment: .leading,
                    spacing: 8
                ) {

                    Text("ƯU ĐÃI CUỐI TUẦN")
                        .font(
                            .caption.weight(
                                .bold
                            )
                        )
                        .foregroundStyle(
                            .white.opacity(0.8)
                        )

                    Text(
                        "Khám phá những\nđiểm đến mới"
                    )
                    .font(
                        .title3.weight(
                            .bold
                        )
                    )
                    .foregroundStyle(.white)

                    Button {
                        // TODO
                    } label: {

                        Text("Khám phá ngay")
                            .font(
                                .caption.weight(
                                    .semibold
                                )
                            )
                            .foregroundStyle(
                                .blue
                            )
                            .padding(
                                .horizontal,
                                14
                            )
                            .padding(
                                .vertical,
                                8
                            )
                            .background(.white)
                            .clipShape(
                                Capsule()
                            )
                    }
                }

                Spacer()

                Image(
                    systemName:
                        "airplane"
                )
                .font(
                    .system(
                        size: 55,
                        weight: .medium
                    )
                )
                .foregroundStyle(
                    .white.opacity(0.85)
                )
                .rotationEffect(
                    .degrees(-15)
                )
            }
            .padding(22)
        }
        .frame(
            maxWidth: .infinity,
            minHeight: 180
        )
    }
}
