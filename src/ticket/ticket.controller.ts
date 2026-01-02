import {
  Controller,
  Get,
  Param,
  Delete,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { User } from '../auth/decorators/auth.decorator';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';
import { TicketCheckInGuard } from '../auth/guards/ticket-check-in.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  findAll() {
    return this.ticketService.findAll();
  }

  @Get('my-tickets')
  getMyTickets(@User() user: any) {
    return this.ticketService.getUserTickets(user.id);
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard, TicketCheckInGuard)
  checkInTicket(@Body() checkInDto: CheckInTicketDto) {
    return this.ticketService.checkInTicket(checkInDto.accessCode);
  }

  @Get('access-code/:code')
  getTicketByAccessCode(@Param('code') code: string) {
    return this.ticketService.getTicketByAccessCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketService.remove(+id);
  }
}
