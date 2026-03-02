import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "src/products/entities/product.entity";
import { User } from "../entities/user.entity";
import { Verification } from "../entities/verification.entity";
import { AddressModule } from "./address/address.module";
import { ShopAddress } from "./address/entities/address.entity";
import { ShopProfile } from "./entities/shop.entity";
import { ShopService } from "./externalService/shopService";
import { ShopReview } from "./reviews/enitites/reviews.entity";
import { ReviewsModule } from "./reviews/reviews.module";
import { ShopRepository } from "./shop.repository";
import { ShopsController } from "./shops.controller";
import { ShopsService } from "./shops.service";

@Module({
  exports: [ShopsService],
  controllers: [ShopsController],
  providers: [ShopsService, ShopService, ShopRepository],
  imports: [
    TypeOrmModule.forFeature([ShopAddress, User, Verification, ShopProfile, ShopReview, Product]),
    AddressModule,
    ReviewsModule,
  ],
})
export class ShopsModule {}
