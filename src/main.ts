import { NestFactory } from '@nestjs/core';
import { ApiShipmentsModule } from './api-shipments.module';
import dotenv from 'dotenv';
import { Callback, Context, Handler } from 'aws-lambda';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import serverlessExpress from '@vendia/serverless-express';
import 'reflect-metadata';

dotenv.config();

let server: Handler;
async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(ApiShipmentsModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true,
      whitelist: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}
export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
}
