import { Module } from '@nestjs/common';
import { ShippingInformationsController } from './shipping_informations.controller';
import { ShippingInformationsService } from './shipping_informations.service';

@Module({
  controllers: [ShippingInformationsController],
  providers: [ShippingInformationsService]
})
export class ShippingInformationsModule {}
