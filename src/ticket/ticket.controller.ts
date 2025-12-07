import { Controller, Post, Body } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('checkin')
  async checkIn(@Body() createTicketDto: CreateTicketDto) {
    return await this.ticketService.checkIn(createTicketDto);
  }
}
