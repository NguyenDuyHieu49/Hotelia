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

            if let reply = review.ownerReply, !reply.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L10n.text("Phản hồi từ khách sạn"))
                        .font(.caption)
                        .fontWeight(.semibold)
                    Text(reply)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct EditorialReviewCard: View {
    let review: EditorialReview

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 2) {
                ForEach(0..<5) { index in
                    Image(systemName: index < review.rating ? "star.fill" : "star")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                }
            }
            Text(review.localizedContent)
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.gray.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
    }
}
