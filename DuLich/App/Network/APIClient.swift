//
//  APIService.swift
//  Hotelia
//
//  Created by Macbook Pro on 12/9/26.
//

import Foundation

class APIClient {
    static let shared = APIClient()
    
    private let baseURL = "http://localhost:3000/api/v1"
    private var accessToken: String?
    
    private init() {}
    
    // MARK: - Headers
    private var headers: [String: String] {
        var headers = ["Content-Type": "application/json"]
        if let token = accessToken {
            headers["Authorization"] = "Bearer \(token)"
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
    
    // MARK: - Request
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
}

// MARK: - Error
enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
}
