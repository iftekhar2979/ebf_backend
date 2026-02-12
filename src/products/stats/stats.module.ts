import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductStat } from './entities/product_stats.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports:[TypeOrmModule.forFeature([ProductStat]),ScheduleModule.forRoot()],
  providers: [StatsService],
  exports:[StatsService]
})
export class StatsModule {}
