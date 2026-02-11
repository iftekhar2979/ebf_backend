import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductStat } from './entities/product_stats.entity';

@Module({
  imports:[TypeOrmModule.forFeature([ProductStat])],
  providers: [StatsService]
})
export class StatsModule {}
