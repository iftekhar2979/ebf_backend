import { Module } from '@nestjs/common';
import { CartItemsService } from './cart_items.service';

@Module({
  providers: [CartItemsService]
})
export class CartItemsModule {}
