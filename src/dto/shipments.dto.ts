import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsIn, IsPositive, IsArray, IsOptional, ValidateIf, NotEquals } from 'class-validator';
import { PartsDto } from './parts.dto';

export class ShipmentsDto {
    @ApiProperty({
        type: String,
        description:'Tipo de servicio',
        example: 'NORMAL',
        required: true,
        nullable: false,
    })
    @IsNotEmpty({
        message: 'Falta uno de los campos obligatorios, [cuenta, ciudad destino , departamento destino o divipola destino, ciudad origen , departamento origen o divipola origen, destinatario, telefono, direccion destino, tipo_de_servicio]',
    })
    @IsString()
    @IsIn([
        'URGENTE',
        'NORMAL',
        'INMEDIATO'
    ], {
        message: 'No tiene configurado tarifas para este tipo de servicio'
    })
    tipo_de_servicio: string;

    @ApiProperty({
        type: String,
        description:'Orden del Servicio',
        example: '10000',
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    orden_servicio: string;

    @ApiProperty({
        type: String,
        description:'Código divipola de origen',
        example: 52379648,
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de origen [Ciudad Origen / Departamento Origen o Divipola Origen]'})
    @ValidateIf(o => o.ciudad_origen === '' || o.ciudad_origen === null || o.ciudad_origen === undefined || o.departamento_origen === '' || o.departamento_origen === null || o.departamento_origen === undefined)
    divipola_origen: string;

    @ApiProperty({
        type: String,
        description:'Código divipola de destino',
        example: 52379648,
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de destino [Ciudad Destino / Departamento Destino o Divipola Destino]'})
    @ValidateIf(o => o.ciudad_destino === '' || o.ciudad_destino === null || o.ciudad_destino === undefined || o.departamento_destino === '' || o.departamento_destino === null || o.departamento_destino === undefined)
    divipola_destino: string;

    @ApiProperty({
        type: String,
        description:'Ciudad Origen',
        example: 'MEDELLIN',
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de origen [Ciudad Origen o Divipola Origen]'})
    @ValidateIf(o => o.divipola_origen === '' || o.divipola_origen === null || o.divipola_origen === undefined)
    @Transform(value => value.value.toUpperCase())
    ciudad_origen: string;

    @ApiProperty({
        type: String,
        description:'Ciudad Destino',
        example: 'MEDELLIN',
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de destino [Ciudad Destino o Divipola Destino]'})
    @ValidateIf(o => o.divipola_destino === '' || o.divipola_destino === null || o.divipola_destino === undefined)
    @Transform(value => value.value.toUpperCase())
    ciudad_destino: string;

    @ApiProperty({
        type: String,
        description:'Departamento Origen',
        example: 'ANTIOQUIA',
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de origen [Departamento Origen o Divipola Origen]'})
    @ValidateIf(o => o.divipola_origen === '' || o.divipola_origen === null || o.divipola_origen === undefined)
    @Transform(value => {
        if (value.value.toUpperCase() === 'BOGOTA') {
            return 'CUNDINAMARCA';
        } 

        return value.value.toUpperCase();
    })
    departamento_origen: string;

    @ApiProperty({
        type: String,
        description:'Departamento Destino',
        example: 'ANTIOQUIA',
        required: false,
        nullable: true,
    })
    @IsString()
    @IsNotEmpty({message: 'Faltan los campos de destino [Departamento Destino o Divipola Destino]'})
    @ValidateIf(o => o.divipola_destino === '' || o.divipola_destino === null || o.divipola_destino === undefined)
    @Transform(value => {
        if (value.value.toUpperCase() === 'BOGOTA') {
            return 'CUNDINAMARCA';
        }

        return value.value.toUpperCase();
    })
    departamento_destino: string;

    @ApiProperty({
        type: String,
        example: '123456',
        description: 'Cuenta',
        required: true,
        nullable: false,
    })
    @IsString()
    @IsNotEmpty({
        message: 'Falta uno de los campos obligatorios, [cuenta, ciudad destino , departamento destino o divipola destino, ciudad origen , departamento origen o divipola origen, destinatario, telefono, direccion destino, tipo_de_servicio]',
    })
    cuenta: string;

    @ApiProperty({
        type: String,
        example: 'Pepipo Perez',
        description: 'Destinatario del envio',
        required: true,
        nullable: false,
    })
    @IsNotEmpty({
        message: 'Falta uno de los campos obligatorios, [cuenta, ciudad destino , departamento destino o divipola destino, ciudad origen , departamento origen o divipola origen, destinatario, telefono, direccion destino, tipo_de_servicio]',
    })
    @IsString()
    destinatario: string;

    @ApiProperty({
        type: String,
        example: '3000000000',
        description: 'Télefono',
        required: true,
        nullable: false,
    })
    @IsNotEmpty({
        message: 'Falta uno de los campos obligatorios, [cuenta, ciudad destino , departamento destino o divipola destino, ciudad origen , departamento origen o divipola origen, destinatario, telefono, direccion destino, tipo_de_servicio]',
    })
    @IsString()
    telefono: string;

    @ApiProperty({
        type: String,
        example: 'Carrera 11 # 22 - 33 INT 444',
        description: 'Dirección de destino',
        required: true,
        nullable: false,
    })
    @IsNotEmpty({
        message: 'Falta uno de los campos obligatorios, [cuenta, ciudad destino , departamento destino o divipola destino, ciudad origen , departamento origen o divipola origen, destinatario, telefono, direccion destino, tipo_de_servicio]',
    })
    @IsString()
    direccion_destino: string;

    @ApiProperty({
        type: PartsDto,
        isArray: true,
        description: 'Piezas del envio',
        required: true,
    })
    @IsNotEmpty({
        message: 'Ingrese los productos a entregar en el campo [piezas]',
    })
    @IsArray()
    piezas: PartsDto[];

    @ApiProperty({
        type: Number,
        description: 'Peso total del envio',
        example: 1,
        minimum: 0.1,
        required: false,
        nullable: true,
    })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    peso_total: number;

    @ApiProperty({
        type: Number,
        description: 'Peso volumetrico calculado',
        example: 1,
        minimum: 0.1,
        required: false,
        nullable: true,
    })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    peso_volumetrico_total: number;

    @ApiProperty({
        type: Number,
        description: 'Valor a recaudar',
        example: 56789,
        maximum: 2000000,
        required: false,
        nullable: true,
    })
    @IsOptional()
    valor_recaudo: number;

    @ApiProperty({
        type: Number,
        description: 'Valor declarado del envio',
        example: 34567,
        maximum: 5000000,
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsPositive({message: 'El campo Valor declarado del envío se encuentra vacío, por favor revisar base procesada'})
    valor_declarado: number;

    @ApiProperty({
      type: Number,
      description: 'Cantidad de piezas',
      example: 10,
      required: false,
      nullable: true,
    })
    @IsOptional()
    @IsPositive()
    @NotEquals(0)
    cantidad_piezas: number;

    @ApiProperty({
      type: String,
      description: 'Forma de pago',
      example: 'Credito - Contado',
      required: false,
      nullable: true,
    })
    forma_pago: string;

    @ApiProperty({
      type: String,
      description: 'Celular',
      example: '3003003333',
      required: false,
      nullable: true,
    })
    @IsOptional()
    @IsString()
    celular: string;

    @ApiProperty({
      type: String,
      description: 'Código de factura',
      example: 'FACT01',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    factura: string;

    @ApiProperty({
      type: String,
      description: 'Producto',
      example: 'CAJAS',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    producto: string;

    @ApiProperty({
      type: String,
      description: 'Celular del origen',
      example: '3003003333',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    cel_origen: string;

    @ApiProperty({
      type: String,
      description: 'Número del pedido',
      example: '10227',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    numero_de_pedido: string;

    @ApiProperty({
      type: String,
      description: 'Url donde se notificará el estado',
      example: 'https://localhost',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    urlNotification: string;

    @ApiProperty({
      type: String,
      description: 'Dirección del origen',
      example: 'Carrera 100 # 13 - 44',
      required: false,
      nullable: true
    })
    @IsOptional()
    @IsString()
    direccion_origen: string;

    valor_flete: number;
    valor_manejo: number;
    costo_recaudo: number;
    costo_total: number;
    descuento: number;
    reason: string;
    nombre_origen: string;
    tel_origen: string;
    complementos;
    guia: number;
    flete:number;

}