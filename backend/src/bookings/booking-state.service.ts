import { Injectable, BadRequestException } from '@nestjs/common';
import { BookingStatus } from '../schemas/booking.schema';

@Injectable()
export class BookingStateService {
  private readonly transitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING_PAYMENT]: [
      BookingStatus.PAID,
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
    ],
    [BookingStatus.PAID]: [
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.REFUNDED,
    ],
    [BookingStatus.CONFIRMED]: [
      BookingStatus.CHECKED_IN,
      BookingStatus.CANCEL_REQUESTED,
    ],
    [BookingStatus.CHECKED_IN]: [
      BookingStatus.CHECKED_OUT,
      BookingStatus.CANCEL_REQUESTED,
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

  canTransition(from: BookingStatus, to: BookingStatus): boolean {
    return this.transitions[from]?.includes(to) || false;
  }

  validateTransition(from: BookingStatus, to: BookingStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Cannot transition from ${from} to ${to}. Valid transitions: ${this.transitions[from]?.join(', ') || 'none'}`
      );
    }
  }

  canCancel(status: BookingStatus): boolean {
    return [
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.PAID,
      BookingStatus.CONFIRMED,
      BookingStatus.CHECKED_IN,
    ].includes(status);
  }

  calculateRefund(booking: any): number {
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilCheckIn >= 7) {
      return booking.totalPrice; // 100% refund
    } else if (daysUntilCheckIn >= 3) {
      return booking.totalPrice * 0.5; // 50% refund
    }
    return 0; // No refund
  }
}
