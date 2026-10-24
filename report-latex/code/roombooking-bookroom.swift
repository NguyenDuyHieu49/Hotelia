    private func bookRoom() {
        guard !isBooking else { return }
        guard let roomType = selectedRoomType else { return }

        let signature = [hotel.id, roomType.id, formatter.string(from: checkIn), formatter.string(from: checkOut),
                         String(guestCount), guestName, guestEmail, guestPhone, specialRequests].joined(separator: "|")
        if pendingRequestSignature != signature {
            pendingRequestSignature = signature
            pendingRequestKey = UUID().uuidString
        }
        guard let requestKey = pendingRequestKey else { return }

        isBooking = true
        errorMessage = nil
        resultUncertain = false

        Task {
            do {
                bookingResult = try await BookingService.shared.createBooking(
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    checkIn: formatter.string(from: checkIn),
                    checkOut: formatter.string(from: checkOut),
                    guestCount: guestCount,
                    guestName: guestName,
                    guestEmail: guestEmail,
                    guestPhone: guestPhone,
                    specialRequests: specialRequests.isEmpty ? nil : specialRequests,
                    requestKey: requestKey
                )
                pendingRequestKey = nil
                pendingRequestSignature = nil
                // Show the created booking so the guest can confirm payment at hotel.
            } catch {
                if error is URLError || error is DecodingError {
                    resultUncertain = true
                } else if case APIError.serverError(let status) = error, status >= 500 {
                    resultUncertain = true
                } else if case APIError.invalidResponse = error {
                    resultUncertain = true
                } else {
                    resultUncertain = false
                }
                errorMessage = resultUncertain
                    ? L10n.text("booking_uncertain_result")
                    : error.localizedDescription
                if !resultUncertain { await loadRoomTypes() }
            }
            isBooking = false
        }
    }
