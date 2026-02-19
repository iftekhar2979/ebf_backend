import { Test, TestingModule } from '@nestjs/testing';
import { ProductRankingsService } from './product_rankings.service';

describe('ProductRankingsService', () => {
  let service: ProductRankingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductRankingsService],
    }).compile();

    service = module.get<ProductRankingsService>(ProductRankingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
