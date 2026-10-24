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
                  SecureTokenStore.shared.value(for: .refresh) == token else { throw APIError.unauthorized }
            SecureTokenStore.shared.set(access, for: .access)
            SecureTokenStore.shared.set(refresh, for: .refresh)
            return access
        }
        pending = job
        defer { pending = nil }
        return try await job.value
    }
}
