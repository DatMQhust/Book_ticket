import {
  Controller,
  Post,
  Body,
  Request,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Public, Roles } from 'src/auth/decorators/auth.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { TurnstileService } from 'src/common/services/turnstile.service';
import { BookingNonceGuard } from 'src/common/guards/booking-nonce.guard';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly configService: ConfigService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Post('reserve')
  @Roles(UserRole.USER)
  @UseGuards(BookingNonceGuard)
  @Throttle({
    strict: { limit: 5, ttl: 60_000 },
    burst: { limit: 1, ttl: 2_000 },
  })
  async reserve(@Request() req, @Body() dto: CreateReservationDto) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    await this.turnstileService.verify(dto.turnstileToken, ip);

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
  @Roles(UserRole.USER)
  async initiatePayment(
    @Request() req,
    @Body() body: { ticketTypeId: string },
  ) {
    const userId = req.user?.id;
    return this.bookingsService.initiatePayment(userId, body.ticketTypeId);
  }

  @Post('webhook')
  @Public()
  @SkipThrottle({ strict: true, burst: true })
  @Throttle({ global: { limit: 200, ttl: 60_000 } }) // 200 req/phút/IP cho payment gateway
  async handleWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
  ) {
    return this.bookingsService.finalizePaymentWebhook(body, authHeader);
  }
}
