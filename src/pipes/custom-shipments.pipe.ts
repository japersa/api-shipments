import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ShipmentsDto } from '../dto/shipments.dto';

@Injectable()
export class CustomShipmentsPipe implements PipeTransform {
  async transform(value: any) {
    if (Array.isArray(value)) {
      const newValue = [];
      for (const element of value) {
        const object = plainToClass(ShipmentsDto, element);
        const errors = await validate(object);
        if (errors.length > 0) {
          throw new BadRequestException(errors);
        }
  
        newValue.push(object);
      }
  
      return newValue;
    } else {
      throw new BadRequestException('El cuerpo de la petición debe ser un array de objetos');
    }
  }
}