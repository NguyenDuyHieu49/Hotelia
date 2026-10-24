    private func perform(_ request: URLRequest) async throws -> (Data, URLResponse) {
        let response = try await URLSession.shared.data(for: request)
        guard (response.1 as? HTTPURLResponse)?.statusCode == 401,
              !request.url!.path.contains("/auth/"),
              let token = SecureTokenStore.shared.value(for: .refresh) else { return response }
        let access = try await AccessTokenRefresher.shared.refresh(baseURL: baseURL, token: token)
        var retry = request
        retry.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization")
        return try await URLSession.shared.data(for: retry)
    }
