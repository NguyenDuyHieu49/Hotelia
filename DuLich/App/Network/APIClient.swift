import Foundation

class APIClient {
    static let shared = APIClient()

    private let baseURL = "http://127.0.0.1:3000/api/v1"
    private var accessToken: String?

    private init() {
        loadToken()
    }

    // Catalog images can be served by the API or a verified external source.
    func mediaURL(_ value: String) -> URL? {
        if value.hasPrefix("/media/") {
            return URL(string: value, relativeTo: URL(string: baseURL))?.absoluteURL
        }
        guard let url = URL(string: value),
              ["https", "http"].contains(url.scheme?.lowercased() ?? "") else { return nil }
        return url
    }

    // MARK: - Headers - Always read fresh token from UserDefaults
    private var headers: [String: String] {
        var headers = ["Content-Type": "application/json"]
        if let token = UserDefaults.standard.string(forKey: "accessToken") {
            headers["Authorization"] = "Bearer \(token)"
        } else {
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

        let (data, response) = try await perform(request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }


        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw responseError(data, status: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    private func responseError(_ data: Data, status: Int) -> APIError {
        if let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let body = envelope["error"] as? [String: Any] ?? envelope
            if let message = body["message"] as? String { return .message(message) }
            if let messages = body["message"] as? [String] { return .message(messages.joined(separator: "\n")) }
        }
        return .serverError(status)
    }

    private func perform(_ request: URLRequest) async throws -> (Data, URLResponse) {
        let response = try await URLSession.shared.data(for: request)
        guard (response.1 as? HTTPURLResponse)?.statusCode == 401,
              !request.url!.path.contains("/auth/"),
              let token = UserDefaults.standard.string(forKey: "refreshToken") else { return response }
        let access = try await AccessTokenRefresher.shared.refresh(baseURL: baseURL, token: token)
        var retry = request
        retry.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
        return try await URLSession.shared.data(for: retry)
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

        let (data, response) = try await perform(request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw responseError(data, status: httpResponse.statusCode)
        }
    }
}

enum APIError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self {
        case .message(let value): return value
        case .unauthorized: return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        case .invalidURL, .invalidResponse: return "Không thể đọc phản hồi máy chủ."
        case .serverError(let code): return "Yêu cầu thất bại (\(code)). Vui lòng thử lại."
        }
    }
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
}

private actor AccessTokenRefresher {
    static let shared = AccessTokenRefresher()
    private var pending: Task<String, Error>?
    func refresh(baseURL: String, token: String) async throws -> String {
        if let pending { return try await pending.value }
        let job = Task<String, Error> {
            var request = URLRequest(url: URL(string: baseURL + "/auth/refresh")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": token])
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let body = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let access = body["accessToken"] as? String,
                  let refresh = body["refreshToken"] as? String,
                  UserDefaults.standard.string(forKey: "refreshToken") == token else { throw APIError.unauthorized }
            UserDefaults.standard.set(access, forKey: "accessToken")
            UserDefaults.standard.set(refresh, forKey: "refreshToken")
            return access
        }
        pending = job
        defer { pending = nil }
        return try await job.value
    }
}
