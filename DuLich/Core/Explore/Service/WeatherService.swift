import Foundation

struct WeatherCity: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let latitude: Double
    let longitude: Double

    nonisolated static let vietnamDestinations: [WeatherCity] = [
        .init(id: "hanoi", name: "Hà Nội", latitude: 21.0278, longitude: 105.8342),
        .init(id: "ho-chi-minh-city", name: "TP. Hồ Chí Minh", latitude: 10.8231, longitude: 106.6297),
        .init(id: "da-nang", name: "Đà Nẵng", latitude: 16.0544, longitude: 108.2022),
        .init(id: "hai-phong", name: "Hải Phòng", latitude: 20.8449, longitude: 106.6881),
        .init(id: "can-tho", name: "Cần Thơ", latitude: 10.0452, longitude: 105.7469),
        .init(id: "nha-trang", name: "Nha Trang", latitude: 12.2388, longitude: 109.1967),
        .init(id: "da-lat", name: "Đà Lạt", latitude: 11.9404, longitude: 108.4583),
        .init(id: "phu-quoc", name: "Phú Quốc", latitude: 10.2899, longitude: 103.9840)
    ]
}

struct WeatherDayForecast: Codable, Identifiable, Sendable {
    nonisolated var id: String { date }
    let date: String
    let weatherCode: Int
    let maximumTemperature: Double
    let minimumTemperature: Double
    let precipitationProbability: Int
}

struct CityWeatherForecast: Codable, Identifiable, Sendable {
    nonisolated var id: String { city.id }
    let city: WeatherCity
    let currentTemperature: Double
    let apparentTemperature: Double
    let weatherCode: Int
    let windSpeed: Double
    let days: [WeatherDayForecast]
    let fetchedAt: Date
}

enum WeatherServiceError: Error {
    case invalidURL
    case invalidResponse
    case unavailable
}

actor WeatherService {
    static let shared = WeatherService()

    private struct CachePayload: Codable {
        let forecasts: [CityWeatherForecast]
        let storedAt: Date
    }

    private struct OpenMeteoResponse: Decodable {
        struct Current: Decodable {
            let temperature: Double
            let apparentTemperature: Double
            let weatherCode: Int
            let windSpeed: Double

            enum CodingKeys: String, CodingKey {
                case temperature = "temperature_2m"
                case apparentTemperature = "apparent_temperature"
                case weatherCode = "weather_code"
                case windSpeed = "wind_speed_10m"
            }
        }

        struct Daily: Decodable {
            let dates: [String]
            let weatherCodes: [Int]
            let maximumTemperatures: [Double]
            let minimumTemperatures: [Double]
            let precipitationProbabilities: [Int]

            enum CodingKeys: String, CodingKey {
                case dates = "time"
                case weatherCodes = "weather_code"
                case maximumTemperatures = "temperature_2m_max"
                case minimumTemperatures = "temperature_2m_min"
                case precipitationProbabilities = "precipitation_probability_max"
            }
        }

        let current: Current
        let daily: Daily
    }

    private let session: URLSession
    private let cacheKey = "hotelia.weather.forecasts.v1"
    private let freshCacheDuration: TimeInterval = 30 * 60
    private let staleCacheDuration: TimeInterval = 6 * 60 * 60

    init(session: URLSession = .shared) {
        self.session = session
    }

    func forecasts(forceRefresh: Bool = false) async throws -> [CityWeatherForecast] {
        let cached = cachedPayload()
        if !forceRefresh,
           let cached,
           Date().timeIntervalSince(cached.storedAt) < freshCacheDuration {
            return ordered(cached.forecasts)
        }

        do {
            let responses = try await Self.fetch(
                cities: WeatherCity.vietnamDestinations,
                session: session
            )
            save(responses)
            return ordered(responses)
        } catch {
            if let cached,
               Date().timeIntervalSince(cached.storedAt) < staleCacheDuration {
                return ordered(cached.forecasts)
            }
            throw WeatherServiceError.unavailable
        }
    }

    private static func fetch(cities: [WeatherCity], session: URLSession) async throws -> [CityWeatherForecast] {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")
        components?.queryItems = [
            URLQueryItem(name: "latitude", value: cities.map { String($0.latitude) }.joined(separator: ",")),
            URLQueryItem(name: "longitude", value: cities.map { String($0.longitude) }.joined(separator: ",")),
            URLQueryItem(name: "current", value: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m"),
            URLQueryItem(name: "daily", value: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"),
            URLQueryItem(name: "timezone", value: "Asia/Ho_Chi_Minh"),
            URLQueryItem(name: "forecast_days", value: "4")
        ]
        guard let url = components?.url else { throw WeatherServiceError.invalidURL }

        var request = URLRequest(url: url)
        request.timeoutInterval = 12
        request.cachePolicy = .reloadRevalidatingCacheData
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw WeatherServiceError.invalidResponse
        }

        let payloads = try JSONDecoder().decode([OpenMeteoResponse].self, from: data)
        guard payloads.count == cities.count else { throw WeatherServiceError.invalidResponse }
        return try zip(cities, payloads).map { try makeForecast(city: $0.0, payload: $0.1) }
    }

    private static func makeForecast(city: WeatherCity, payload: OpenMeteoResponse) throws -> CityWeatherForecast {
        let count = [
            payload.daily.dates.count,
            payload.daily.weatherCodes.count,
            payload.daily.maximumTemperatures.count,
            payload.daily.minimumTemperatures.count,
            payload.daily.precipitationProbabilities.count
        ].min() ?? 0
        guard count > 0 else { throw WeatherServiceError.invalidResponse }

        let days = (0..<min(count, 4)).map { index in
            WeatherDayForecast(
                date: payload.daily.dates[index],
                weatherCode: payload.daily.weatherCodes[index],
                maximumTemperature: payload.daily.maximumTemperatures[index],
                minimumTemperature: payload.daily.minimumTemperatures[index],
                precipitationProbability: payload.daily.precipitationProbabilities[index]
            )
        }
        return CityWeatherForecast(
            city: city,
            currentTemperature: payload.current.temperature,
            apparentTemperature: payload.current.apparentTemperature,
            weatherCode: payload.current.weatherCode,
            windSpeed: payload.current.windSpeed,
            days: days,
            fetchedAt: Date()
        )
    }

    private func cachedPayload() -> CachePayload? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode(CachePayload.self, from: data)
    }

    private func save(_ forecasts: [CityWeatherForecast]) {
        let payload = CachePayload(forecasts: forecasts, storedAt: Date())
        guard let data = try? JSONEncoder().encode(payload) else { return }
        UserDefaults.standard.set(data, forKey: cacheKey)
    }

    private func ordered(_ forecasts: [CityWeatherForecast]) -> [CityWeatherForecast] {
        let order = Dictionary(uniqueKeysWithValues: WeatherCity.vietnamDestinations.enumerated().map { ($1.id, $0) })
        return forecasts.sorted { order[$0.id, default: Int.max] < order[$1.id, default: Int.max] }
    }
}
