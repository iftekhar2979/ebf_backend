import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductStat } from "./entities/product_stats.entity";
import { STATS_QUEUE, StatsService } from "./stats.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductStat]),
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: STATS_QUEUE }),
  ],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
