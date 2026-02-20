import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ItemsModule } from "./items/items.module";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [ItemsModule],
})
export class OrdersModule {}
