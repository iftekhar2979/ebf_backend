import { Module } from '@nestjs/common';
import { GlobalStatsService } from './global_stats.service';

@Module({
  providers: [GlobalStatsService]
})
export class GlobalStatsModule {}
