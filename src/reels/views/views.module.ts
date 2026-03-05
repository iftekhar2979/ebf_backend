import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { REEL_VIEWS_QUEUE } from "../constants/reels.constants";
import { Reel } from "../entities/reels.entity";
import { ReelViewer } from "./entities/reels_viewers.entity";
import { ViewsController } from "./views.controller";
import { ViewsService } from "./views.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: REEL_VIEWS_QUEUE,
    }),
    TypeOrmModule.forFeature([ReelViewer, Reel]),
  ],
  controllers: [ViewsController],
  providers: [ViewsService],
  exports: [ViewsService],
})
export class ReelViewsModule {}
