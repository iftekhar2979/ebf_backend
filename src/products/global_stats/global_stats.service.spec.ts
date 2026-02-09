import { Test, TestingModule } from '@nestjs/testing';
import { GlobalStatsService } from './global_stats.service';

describe('GlobalStatsService', () => {
  let service: GlobalStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalStatsService],
    }).compile();

    service = module.get<GlobalStatsService>(GlobalStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
