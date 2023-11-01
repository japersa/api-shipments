import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ApiShipmentsController } from './api-shipments.controller';
import { ApiShipmentsService } from './api-shipments.service';
import { LoggerService } from './common/logger/logger.service';
import { TokenInterceptor } from './interceptors/token.interceptor';
import { DynamoDBProvider } from './providers/dynamoDB.provider';
import { TokenService } from './services/token.service';
import { OrdersService } from './services/orders.service';
import { CitiesService } from './services/cities.service';
import { SubsidiariesService } from './services/subsidiaries.services';
import { DestinyTypesService } from './services/destiny-types.service';
import { ShipmentsService } from './services/shipments.service';
import { ClientQuotesService } from './services/client-quotes.service';
import { SettingsService } from './services/settings.service';
import { CoverageMatrixService } from './services/coverage-matrix.service';
import { LoggerMiddleware } from './middlewares/logger.middleware';

@Module({
  imports: [],
  controllers: [ApiShipmentsController],
  providers: [
    ApiShipmentsService,
    LoggerService,
    TokenInterceptor,
    DynamoDBProvider,
    TokenService,
    OrdersService,
    CitiesService,
    SubsidiariesService,
    DestinyTypesService,
    ShipmentsService,
    ClientQuotesService,
    SettingsService,
    CoverageMatrixService,
  ],
  exports: [
    DynamoDBProvider,
    LoggerService,
  ]
})
export class ApiShipmentsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(ApiShipmentsController);
  }
}
