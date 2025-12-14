import { Controller, Post, Body, Request, Headers } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Public } from 'src/auth/decorators/auth.decorator';

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

  @Post('initiate-payment')
  async initiatePayment(
    @Request() req,
    @Body() body: { ticketTypeId: string },
  ) {
    const userId = req.user?.id;
    return this.bookingsService.initiatePayment(userId, body.ticketTypeId);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
  ) {
    return this.bookingsService.finalizePaymentWebhook(body, authHeader);
  }
}
