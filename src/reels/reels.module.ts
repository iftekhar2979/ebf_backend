import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RedisModule } from "../redis/redis.module";
import { Reel } from "./entities/reels.entity";
import { ReelsController } from "./reels.controller";
import { ReelsService } from "./reels.service";
import { ViewsModule } from "./views/views.module";

@Module({
  controllers: [ReelsController],
  providers: [ReelsService],
  imports: [
    TypeOrmModule.forFeature([Reel]),
    RedisModule,
    ViewsModule
  ],
})
export class ReelsModule {}
