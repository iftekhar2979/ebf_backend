import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PRODUCT_VIEW_QUEUE } from "src/bull/types/product.view.types";
import { ProductView } from "./entities/views.entity";
import { ViewsController } from "./views.controller";
import { ViewsService } from "./views.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductView]),
    BullModule.registerQueue({
      name: PRODUCT_VIEW_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [ViewsService],
  controllers: [ViewsController],
})
export class ViewsModule {}
