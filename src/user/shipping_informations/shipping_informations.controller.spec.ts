import { Test, TestingModule } from '@nestjs/testing';
import { ShippingInformationsController } from './shipping_informations.controller';

describe('ShippingInformationsController', () => {
  let controller: ShippingInformationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingInformationsController],
    }).compile();

    controller = module.get<ShippingInformationsController>(ShippingInformationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
