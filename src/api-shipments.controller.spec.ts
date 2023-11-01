import { Test, TestingModule } from '@nestjs/testing';
import { ApiShipmentsController } from './api-shipments.controller';
import { ApiShipmentsService } from './api-shipments.service';

describe('ApiShipmentsController', () => {
  let apiShipmentsController: ApiShipmentsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ApiShipmentsController],
      providers: [ApiShipmentsService],
    }).compile();

    apiShipmentsController = app.get<ApiShipmentsController>(ApiShipmentsController);
  });

  describe('root', () => {
  });
});
