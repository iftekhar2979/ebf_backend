import { Module } from '@nestjs/common';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { CartItemsModule } from './cart_items/cart_items.module';

@Module({
  controllers: [CartsController],
  providers: [CartsService],
  imports: [CartItemsModule]
})
export class CartsModule {}
