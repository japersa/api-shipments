import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, NotEquals } from 'class-validator';

export class PartsDto {
    @ApiProperty({
      type: String,
      description: 'Nombre del producto a entregar',
      example: 'Teclado Inalámbrico NOVA',
      nullable: false,
    })
    @IsNotEmpty()
    @IsString()
    producto: string;

    @ApiProperty({
      type: Number,
      description: 'Cantidad de piezas de la misma referencia',
      example: '1',
      nullable: false,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    cantidad: number;

    @ApiProperty({
      type: Number,
      description: 'Tamaño en centímetros - Alto',
      example: '2',
      nullable: false,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    @IsDecimal({decimal_digits: '2'})
    alto: number; //CM

    @ApiProperty({
      type: Number,
      description: 'Tamaño en centímetros - Ancho',
      example: '13.3.2',
      nullable: false,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    @IsDecimal({decimal_digits: '2'})
    ancho: number; //CM

    @ApiProperty({
      type: Number,
      description: 'Tamaño en centímetros - Largo',
      example: '44.1',
      nullable: false,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    @IsDecimal({decimal_digits: '2'})
    largo: number; //CM
    
    @ApiProperty({
      type: Number,
      description: 'Peso del paquete en Kilogramos (KG)',
      example: '45',
      nullable: false,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    @IsDecimal({decimal_digits: '2'})
    peso: number; //KG

    @ApiProperty({
      type: Number,
      description: 'Peso cubicado. Cálculo con las medidas de la pieza',
      example: '45',
      nullable: true,
    })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @NotEquals(0)
    @IsDecimal({decimal_digits: '2'})
    pesocubicado?: number; //KG
  }