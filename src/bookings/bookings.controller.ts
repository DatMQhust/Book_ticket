import { Controller, Post, Body, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('reserve')
  async reserve(@Request() req, @Body() dto: CreateReservationDto) {
    const userId = req.user?.id;
    return this.bookingsService.reserveTicket(
      userId,
      dto.ticketTypeId,
      dto.quantity,
    );
  }

  @Post('confirm')
  async confirm(@Request() req, @Body() body: { ticketTypeId: string }) {
    const userId = req.user?.id;
    return this.bookingsService.confirmBooking(userId, body.ticketTypeId);
  }
}
