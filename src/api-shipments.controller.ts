import { Controller, Post, Body, Res, UseInterceptors, Req, UsePipes } from '@nestjs/common';
import { ApiShipmentsService } from './api-shipments.service';
import { ShipmentsDto } from './dto/shipments.dto';
import { HttpStatusCode } from 'axios';
import { TokenInterceptor } from './interceptors/token.interceptor';
import { CustomShipmentsPipe } from './pipes/custom-shipments.pipe';

@Controller('api-shipments')
export class ApiShipmentsController {
  constructor(private readonly apiShipmentsService: ApiShipmentsService) {}
  
  @UseInterceptors(TokenInterceptor)
  @Post('create')
  @UsePipes(new CustomShipmentsPipe())
  async createShipments(
    @Res() res,
    @Body() body: ShipmentsDto[],
    @Req() request,
  ){
    const client = request.client;
    const response = await this.apiShipmentsService.create(
      client,
      body
    );

    return res.status(HttpStatusCode.Ok).json({
      statusCode: HttpStatusCode.Ok,
      message:'success',
      data: response,
    });
  }

  @UseInterceptors(TokenInterceptor)
  @Post('quote-generator')
  async quoteGenerator(
    @Res() res,
    @Body() body: ShipmentsDto,
    @Req() request,
  ) {
    const client = request.client;
    const response =  await this.apiShipmentsService.generateQuote(
      client,
      body
    );

    return res.status(HttpStatusCode.Ok).json(response);
  }
}
