import SwiftUI

// Legacy entry point shares the real room selection and booking flow.
struct RoomDetailView: View {
    let hotel: Hotel
    var body: some View { RoomBookingView(hotel: hotel) }
}
