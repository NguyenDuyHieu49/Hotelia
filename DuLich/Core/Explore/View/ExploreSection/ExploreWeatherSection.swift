import SwiftUI

struct ExploreWeatherSection: View {
    @ObservedObject var viewModel: WeatherViewModel
    let onRefresh: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header

            if viewModel.forecasts.isEmpty {
                if viewModel.isLoading {
                    loadingCards
                } else if let errorMessage = viewModel.errorMessage {
                    errorState(errorMessage)
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 13) {
                        ForEach(viewModel.forecasts) { forecast in
                            WeatherCard(forecast: forecast)
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollTargetBehavior(.viewAligned)
                .contentMargins(.horizontal, 1, for: .scrollContent)
            }

        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.14))
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(.orange)
            }
            .frame(width: 38, height: 38)

            VStack(alignment: .leading, spacing: 2) {
                Text("weather_destinations_title")
                    .font(.title3.weight(.bold))
                if let updated = viewModel.lastUpdated {
                    Text("\(L10n.text("weather_updated")) \(updated.formatted(date: .omitted, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("weather_section_subtitle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Button(action: onRefresh) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 36, height: 36)
                    .background(Color(.secondarySystemGroupedBackground), in: Circle())
                    .rotationEffect(viewModel.isLoading ? .degrees(360) : .zero)
                    .animation(viewModel.isLoading ? .linear(duration: 0.8).repeatForever(autoreverses: false) : .default, value: viewModel.isLoading)
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isLoading)
            .accessibilityLabel(Text("weather_refresh"))
        }
    }

    private var loadingCards: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 13) {
                ForEach(0..<2, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 22)
                        .fill(Color(.secondarySystemGroupedBackground))
                        .frame(width: 286, height: 214)
                        .overlay { ProgressView() }
                }
            }
        }
        .accessibilityLabel(Text("weather_loading"))
    }

    private func errorState(_ message: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.title3)
                .foregroundStyle(.orange)
            Text(message)
                .font(.subheadline)
            Spacer()
            Button("Thử lại", action: onRefresh)
                .buttonStyle(.bordered)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct WeatherCard: View {
    let forecast: CityWeatherForecast

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(HotelContentLocalization.city(forecast.city.name))
                        .font(.headline)
                    Text(WeatherPresentation.description(for: forecast.weatherCode))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.82))
                }
                Spacer()
                Image(systemName: WeatherPresentation.symbol(for: forecast.weatherCode))
                    .symbolRenderingMode(.multicolor)
                    .font(.system(size: 34, weight: .medium))
            }

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("\(Int(forecast.currentTemperature.rounded()))°")
                    .font(.system(size: 43, weight: .bold, design: .rounded))
                    .contentTransition(.numericText())
                Text(L10n.format("weather_feels_like_format", Int(forecast.apparentTemperature.rounded())))
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.78))
                Spacer()
                Label("\(Int(forecast.windSpeed.rounded())) km/h", systemImage: "wind")
                    .font(.caption.weight(.medium))
            }

            HStack(spacing: 0) {
                ForEach(Array(forecast.days.prefix(3).enumerated()), id: \.element.id) { index, day in
                    VStack(spacing: 4) {
                        Text(WeatherPresentation.dayLabel(day.date, isToday: index == 0))
                            .font(.caption2.weight(.semibold))
                        Image(systemName: WeatherPresentation.symbol(for: day.weatherCode))
                            .symbolRenderingMode(.multicolor)
                            .font(.subheadline)
                        Text("\(Int(day.maximumTemperature.rounded()))° / \(Int(day.minimumTemperature.rounded()))°")
                            .font(.caption2.monospacedDigit())
                        Label("\(day.precipitationProbability)%", systemImage: "drop.fill")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .foregroundStyle(.white)
        .padding(17)
        .frame(width: 286, height: 214)
        .background(WeatherPresentation.gradient(for: forecast.weatherCode), in: RoundedRectangle(cornerRadius: 22))
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(.white.opacity(0.08))
                .frame(width: 110, height: 110)
                .offset(x: 30, y: -38)
                .allowsHitTesting(false)
        }
        .shadow(color: WeatherPresentation.shadowColor(for: forecast.weatherCode), radius: 14, y: 8)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(WeatherPresentation.accessibilityLabel(for: forecast))
    }
}

private enum WeatherPresentation {
    static func symbol(for code: Int) -> String {
        switch code {
        case 0: return "sun.max.fill"
        case 1, 2: return "cloud.sun.fill"
        case 3: return "cloud.fill"
        case 45, 48: return "cloud.fog.fill"
        case 51...57: return "cloud.drizzle.fill"
        case 61...67, 80...82: return "cloud.rain.fill"
        case 71...77, 85, 86: return "cloud.snow.fill"
        case 95...99: return "cloud.bolt.rain.fill"
        default: return "cloud.fill"
        }
    }

    static func description(for code: Int) -> String {
        switch code {
        case 0: return L10n.text("weather_clear")
        case 1, 2: return L10n.text("weather_partly_cloudy_short")
        case 3: return L10n.text("weather_cloudy")
        case 45, 48: return L10n.text("weather_fog")
        case 51...57: return L10n.text("weather_drizzle")
        case 61...67, 80...82: return L10n.text("weather_rain")
        case 71...77, 85, 86: return L10n.text("weather_snow")
        case 95...99: return L10n.text("weather_thunderstorm")
        default: return L10n.text("unknown_weather")
        }
    }

    static func gradient(for code: Int) -> LinearGradient {
        let colors: [Color]
        switch code {
        case 0...2:
            colors = [Color(red: 0.10, green: 0.55, blue: 0.80), Color(red: 0.22, green: 0.72, blue: 0.72)]
        case 45, 48:
            colors = [Color(red: 0.32, green: 0.39, blue: 0.48), Color(red: 0.49, green: 0.57, blue: 0.62)]
        case 51...82:
            colors = [Color(red: 0.12, green: 0.29, blue: 0.50), Color(red: 0.18, green: 0.47, blue: 0.61)]
        case 95...99:
            colors = [Color(red: 0.18, green: 0.18, blue: 0.33), Color(red: 0.30, green: 0.24, blue: 0.48)]
        default:
            colors = [Color(red: 0.25, green: 0.36, blue: 0.48), Color(red: 0.39, green: 0.51, blue: 0.58)]
        }
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    static func shadowColor(for code: Int) -> Color {
        gradientBaseColor(for: code).opacity(0.22)
    }

    private static func gradientBaseColor(for code: Int) -> Color {
        switch code {
        case 0...2: return .cyan
        case 51...82: return .blue
        case 95...99: return .indigo
        default: return .gray
        }
    }

    static func dayLabel(_ value: String, isToday: Bool) -> String {
        if isToday { return L10n.text("weather_today_short") }
        let input = DateFormatter()
        input.locale = Locale(identifier: "en_US_POSIX")
        input.dateFormat = "yyyy-MM-dd"
        guard let date = input.date(from: value) else { return value }
        return date.formatted(.dateTime.weekday(.abbreviated).locale(AppLanguage.selected.locale))
    }

    static func accessibilityLabel(for forecast: CityWeatherForecast) -> String {
        L10n.format(
            "weather_accessibility_format",
            HotelContentLocalization.city(forecast.city.name),
            Int(forecast.currentTemperature.rounded()),
            description(for: forecast.weatherCode)
        )
    }
}
