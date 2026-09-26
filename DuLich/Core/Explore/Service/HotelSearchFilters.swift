import Foundation

struct HotelSearchFilters: Equatable {
    var checkIn: String?
    var checkOut: String?
    var guests: Int = 1
    var minPrice: Int?
    var maxPrice: Int?
    var minRating: Int?
    var queryItems: [URLQueryItem] {
        var items = [URLQueryItem(name: "guests", value: String(guests))]
        for (name, value) in [("checkIn", checkIn), ("checkOut", checkOut),
                              ("minPrice", minPrice.map(String.init)), ("maxPrice", maxPrice.map(String.init)),
                              ("minRating", minRating.map(String.init))] {
            if let value { items.append(URLQueryItem(name: name, value: value)) }
        }
        return items
    }
}
