import Foundation

struct HotelSearchFilters: Equatable {
    var checkIn: String?
    var checkOut: String?
    var guests: Int = 1
    var minPrice: Int?
    var maxPrice: Int?
    var minRating: Int?
    var queryItems: [URLQueryItem] {
        // Default browsing includes catalog listings that have not opened room sales.
        // Once dates, price, or a larger party is selected, show only bookable rooms.
        var items: [URLQueryItem] = []
        if guests > 1 || checkIn != nil || checkOut != nil || minPrice != nil || maxPrice != nil {
            items.append(URLQueryItem(name: "guests", value: String(guests)))
        }
        for (name, value) in [("checkIn", checkIn), ("checkOut", checkOut),
                              ("minPrice", minPrice.map(String.init)), ("maxPrice", maxPrice.map(String.init)),
                              ("minRating", minRating.map(String.init))] {
            if let value { items.append(URLQueryItem(name: name, value: value)) }
        }
        return items
    }
}
