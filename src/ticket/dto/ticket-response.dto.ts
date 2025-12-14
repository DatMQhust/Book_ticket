export class TicketResponseDto {
  id: string;
  accessCode: string;
  status: string;
  checkedInAt: Date | null;
  createdAt: Date;

  ticketType: {
    id: string;
    name: string;
    price: number;
    description: string;
  };

  event: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    location: string;
    thumbnail: string;
  };

  session?: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
  };

  order: {
    id: string;
    totalPrice: number;
    status: string;
    createdAt: Date;
  };
}
