export class CheckInResponseDto {
  id: string;
  accessCode: string;
  status: string;
  checkedInAt: Date;
  ticketType: {
    id: string;
    name: string;
    price: number;
  };

  event: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    location: string;
  };

  session?: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
  };

  user: {
    id: string;
    name: string;
    email: string;
  };

  message: string;
}
