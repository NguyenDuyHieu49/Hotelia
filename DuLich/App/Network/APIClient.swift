import Foundation

class APIClient {
    static let shared = APIClient()

    private let baseURL = "http://127.0.0.1:3000/api/v1"
    private var accessToken: String?

    private init() {
        loadToken()
    }

    // MARK: - Headers - Always read fresh token from UserDefaults
    private var headers: [String: String] {
        var headers = ["Content-Type": "application/json"]
        if let token = UserDefaults.standard.string(forKey: "accessToken") {
            headers["Authorization"] = "Bearer \(token)"
            print("[DEBUG-APIClient] Token: \(token.prefix(30))...")
        } else {
            print("[DEBUG-APIClient] No token!")
        }
        return headers
    }

    // MARK: - Token Management
    func setAccessToken(_ token: String) {
        self.accessToken = token
        UserDefaults.standard.set(token, forKey: "accessToken")
    }

    func loadToken() {
        self.accessToken = UserDefaults.standard.string(forKey: "accessToken")
    }

    func clearToken() {
        self.accessToken = nil
        UserDefaults.standard.removeObject(forKey: "accessToken")
    }

    // MARK: - Request with Response
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }

        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Void Request (no response body)
    func requestVoid(
        endpoint: String,
        method: String = "POST",
        body: [String: Any]? = nil
    ) async throws {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }

        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
}
