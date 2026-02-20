import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StatsModule } from "../stats/stats.module";
import { BoostsController } from "./boosts.controller";
import { BoostsService } from "./boosts.service";
import { ProductBoosting } from "./entities/boosts.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductBoosting]),
    BullModule.registerQueue(
      {
        name: "boost-queue",
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: "product-queue",
      }
    ),
    ScheduleModule.forRoot(),
    // RedisModule,
    StatsModule,
  ],
  controllers: [BoostsController],
  providers: [BoostsService],
  exports: [BoostsService],
})
export class BoostsModule {}
