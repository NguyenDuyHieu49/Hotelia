  private readonly transitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING_PAYMENT]: [
      BookingStatus.PAID,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
    ],
    [BookingStatus.PAID]: [
      BookingStatus.CONFIRMED,
      BookingStatus.REFUNDED,
    ],
    [BookingStatus.CONFIRMED]: [
      BookingStatus.CHECKED_IN,
      BookingStatus.CANCEL_REQUESTED,
    ],
    [BookingStatus.CHECKED_IN]: [
      BookingStatus.CHECKED_OUT,
    ],
    [BookingStatus.CHECKED_OUT]: [BookingStatus.COMPLETED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCEL_REQUESTED]: [
      BookingStatus.REFUNDED,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.REFUNDED]: [],
    [BookingStatus.EXPIRED]: [],
  };
