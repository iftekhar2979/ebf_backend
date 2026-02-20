import { Module } from "@nestjs/common";
import { ImagesController } from "./images.controller";
import { ImagesService } from "./images.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../entities/product.entity";
import { ProductImage } from "./entities/images.entity";
import { ProductCacheService } from "../caches/caches.service";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    BullModule.registerQueue({ name: "product-queue" }),
  ],
  controllers: [ImagesController],
  providers: [ImagesService, ProductCacheService],
})
export class ImagesModule {}
