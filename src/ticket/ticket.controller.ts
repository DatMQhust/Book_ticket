import { Controller, Get, Param, Delete } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { User } from '../auth/decorators/auth.decorator';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketService.remove(+id);
  }
}
