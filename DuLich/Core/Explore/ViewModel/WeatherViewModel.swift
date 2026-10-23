import Foundation
import Combine

@MainActor
final class WeatherViewModel: ObservableObject {
    @Published private(set) var forecasts: [CityWeatherForecast] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private let fetchForecasts: (Bool) async throws -> [CityWeatherForecast]

    init(fetchForecasts: @escaping (Bool) async throws -> [CityWeatherForecast] = {
        try await WeatherService.shared.forecasts(forceRefresh: $0)
    }) {
        self.fetchForecasts = fetchForecasts
    }

    var lastUpdated: Date? {
        forecasts.map(\.fetchedAt).max()
    }

    func load(forceRefresh: Bool = false) async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            forecasts = try await fetchForecasts(forceRefresh)
        } catch is CancellationError {
            return
        } catch {
            if forecasts.isEmpty {
                errorMessage = L10n.text("weather_load_error")
            }
        }
    }
}
