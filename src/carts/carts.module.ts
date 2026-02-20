import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CART_QUEUE } from "./ carts.queue";
import { CartItemsModule } from "./cart_items/cart_items.module";
import { CartItem } from "./cart_items/entities/cart_items.entity";
import { CartController } from "./carts.controller";
import { CartService } from "./carts.service";
import { Cart } from "./entities/carts.entity";

@Module({
  controllers: [CartController],
  providers: [CartService],
  imports: [
    CartItemsModule,
    TypeOrmModule.forFeature([Cart, CartItem]),
    BullModule.registerQueue({ name: CART_QUEUE }),
  ],
  exports: [CartService],
})
export class CartsModule {}
