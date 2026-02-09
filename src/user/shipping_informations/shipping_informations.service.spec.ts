import { Test, TestingModule } from '@nestjs/testing';
import { ShippingInformationsService } from './shipping_informations.service';

describe('ShippingInformationsService', () => {
  let service: ShippingInformationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShippingInformationsService],
    }).compile();

    service = module.get<ShippingInformationsService>(ShippingInformationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
