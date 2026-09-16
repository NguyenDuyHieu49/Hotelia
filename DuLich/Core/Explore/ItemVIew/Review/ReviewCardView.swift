import SwiftUI

struct ReviewCardItemView: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 2) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < review.rating ? "star.fill" : "star")
                            .font(.caption)
                            .foregroundColor(.yellow)
                    }
                }
                Spacer()
                Text(review.createdAt?.prefix(10) ?? "")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let title = review.title {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Text(review.content)
                .font(.body)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}
