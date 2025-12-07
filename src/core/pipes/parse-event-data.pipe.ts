import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from '../../events/dto/create-event.dto';

@Injectable()
export class ParseEventDataPipe implements PipeTransform {
  async transform(value: string, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value) {
      throw new BadRequestException('Validation failed: No data provided');
    }

    let parsedData: any;
    try {
      // 1. Parse chuỗi JSON
      parsedData = JSON.parse(value);
    } catch {
      throw new BadRequestException('Validation failed: Invalid JSON string');
    }

    const dtoInstance = plainToInstance(CreateEventDto, parsedData);

    // 3. Validate DTO
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const errorMessages = errors.map((err) => Object.values(err.constraints));
      throw new BadRequestException(
        `Validation failed: ${errorMessages.join(', ')}`,
      );
    }

    return dtoInstance;
  }
}
