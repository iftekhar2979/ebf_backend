import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { AddressModule } from './address/address.module';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService],
  imports: [AddressModule]
})
export class ShopsModule {}
