import { Module } from "@nestjs/common";
import { ShopsController } from "./shops.controller";
import { ShopsService } from "./shops.service";
import { AddressModule } from "./address/address.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ShopAddress } from "./address/entities/address.entity";
import { User } from "../entities/user.entity";
import { Verification } from "../entities/verification.entity";
import { ShopProfile } from "./entities/shop.entity";

@Module({
  exports: [ShopsService],
  controllers: [ShopsController],
  providers: [ShopsService],
  imports: [TypeOrmModule.forFeature([ShopAddress, User, Verification, ShopProfile]), AddressModule],
})
export class ShopsModule {}
