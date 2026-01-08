import { Controller, Post, Body, Request, Headers } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Public } from 'src/auth/decorators/auth.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('reserve')
  async reserve(@Request() req, @Body() dto: CreateReservationDto) {
    let userId = req.user?.id;

    const serverSecret = this.configService.get<string>('LOAD_TEST_SECRET');
    const requestSecret = req.headers['x-load-test-secret'];

    if (serverSecret && serverSecret === requestSecret) {
      const mockUserId = req.headers['x-mock-user-id'];
      if (mockUserId) {
        userId = mockUserId;
      }
    }

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
