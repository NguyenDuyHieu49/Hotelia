import Foundation

// MARK: - ML Ranking Models

struct RankingRequest: Codable {
    let sessionId: String
    let cityId: Int
    let device: String
    let platform: String
    let candidateItems: [String]
    let timestamp: String?

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case cityId = "city_id"
        case device
        case platform
        case candidateItems = "candidate_items"
        case timestamp
    }
}

struct RankedItem: Codable, Identifiable {
    let itemId: String
    let score: Double
    let rank: Int

    var id: String { itemId }

    enum CodingKeys: String, CodingKey {
        case itemId = "item_id"
        case score
        case rank
    }
}

struct RankingResponse: Codable {
    let sessionId: String
    let rankedItems: [RankedItem]
    let modelVersion: String
    let latencyMs: Double
    let fallbackUsed: Bool

    enum CodingKeys: String, CodingKey {
        case sessionId = "session_id"
        case rankedItems = "ranked_items"
        case modelVersion = "model_version"
        case latencyMs = "latency_ms"
        case fallbackUsed = "fallback_used"
    }
}

struct HealthResponse: Codable {
    let status: String
    let modelLoaded: Bool
    let version: String

    enum CodingKeys: String, CodingKey {
        case status
        case modelLoaded = "model_loaded"
        case version
    }
}

// MARK: - Recommendation Service

class RecommendationService {
    static let shared = RecommendationService()

    private let rankingAPIURL: String
    private var sessionId: String

    private init() {
        // ML Ranking API URL - change to production URL when deployed
        self.rankingAPIURL = ProcessInfo.processInfo.environment["RANKING_API_URL"] ?? "http://127.0.0.1:8000"
        self.sessionId = UUID().uuidString
    }

    // MARK: - Generate New Session
    func generateNewSession() {
        sessionId = UUID().uuidString
    }

    // MARK: - Health Check
    func checkHealth() async throws -> HealthResponse {
        let url = URL(string: "\(rankingAPIURL)/health")!
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw RecommendationError.serviceUnavailable
        }

        let decoder = JSONDecoder()
        return try decoder.decode(HealthResponse.self, from: data)
    }

    // MARK: - Get Recommendations
    func getRecommendations(
        cityId: Int,
        device: DeviceType = .mobile,
        platform: PlatformType = .ios,
        candidateItems: [String]
    ) async throws -> RankingResponse {
        let request = RankingRequest(
            sessionId: sessionId,
            cityId: cityId,
            device: device.rawValue,
            platform: platform.rawValue,
            candidateItems: candidateItems,
            timestamp: ISO8601DateFormatter().string(from: Date())
        )

        let url = URL(string: "\(rankingAPIURL)/rank")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw RecommendationError.serviceUnavailable
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            print("[RecommendationService] Error: \(httpResponse.statusCode)")
            throw RecommendationError.requestFailed(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(RankingResponse.self, from: data)
    }

    // MARK: - Rank Hotels
    /// Ranks hotels using ML model and returns sorted hotel IDs
    func rankHotels(
        hotels: [Hotel],
        cityId: Int,
        device: DeviceType = .mobile,
        platform: PlatformType = .ios
    ) async throws -> [String] {
        // Extract hotel IDs
        let candidateIds = hotels.map { $0.id }

        // Get ranked response
        let response = try await getRecommendations(
            cityId: cityId,
            device: device,
            platform: platform,
            candidateItems: candidateIds
        )

        print("[RecommendationService] Model: \(response.modelVersion), " +
              "Latency: \(response.latencyMs)ms, Fallback: \(response.fallbackUsed)")

        // Return ranked item IDs in order
        return response.rankedItems.map { $0.itemId }
    }
}

// MARK: - Supporting Types

enum DeviceType: String {
    case mobile = "mobile"
    case desktop = "desktop"
    case tablet = "tablet"
}

enum PlatformType: String {
    case ios = "ios"
    case android = "android"
    case web = "web"
}

enum RecommendationError: Error, LocalizedError {
    case serviceUnavailable
    case requestFailed(Int)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .serviceUnavailable:
            return "Recommendation service is unavailable"
        case .requestFailed(let code):
            return "Request failed with status code: \(code)"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}

// MARK: - Popularity Fallback
extension RecommendationService {
    /// Simple popularity-based fallback when ML service is unavailable
    func getPopularityRanking(hotels: [Hotel]) -> [Hotel] {
        // Sort by rating and review count as proxy for popularity
        return hotels.sorted { (h1: Hotel, h2: Hotel) in
            let score1 = (h1.averageRating ?? 0.0) * Double(h1.reviewCount ?? 0) / 100.0
            let score2 = (h2.averageRating ?? 0.0) * Double(h2.reviewCount ?? 0) / 100.0
            return score1 > score2
        }
    }
}
