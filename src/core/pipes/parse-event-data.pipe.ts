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

    const errors = await validate(dtoInstance, {
      validationError: { target: false },
    });

    if (errors.length > 0) {
      const extractErrors = (err: any, parentPath = ''): string[] => {
        const currentPath = parentPath
          ? `${parentPath}.${err.property}`
          : err.property;

        if (err.constraints) {
          return Object.values(err.constraints).map(
            (msg: any) => `${currentPath}: ${msg}`,
          );
        }

        if (err.children && err.children.length > 0) {
          const childErrors = err.children
            .map((child: any) => extractErrors(child, currentPath))
            .flat();

          if (childErrors.length > 0) {
            return childErrors;
          }
        }

        return [`Validation error in ${currentPath}`];
      };

      const errorMessages = errors.map((err) => extractErrors(err)).flat();

      throw new BadRequestException(
        `Validation failed: ${errorMessages.join(', ')}`,
      );
    }

    return dtoInstance;
  }
}
