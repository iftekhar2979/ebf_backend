import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../entities/product.entity";
import { ProductVariant } from "./entities/varients.entity";
import { VarientsController } from "./varients.controller";
import { VarientsService } from "./varients.service";
// import { CacheModule } from '@nestjs/cache-manager';
import { CachesModule } from "../caches/caches.module";

@Module({
  imports: [
    CachesModule,
    BullModule.registerQueue({ name: "product-queue" }),
    TypeOrmModule.forFeature([Product, ProductVariant]),
    BullModule.registerQueue({ name: "product-queue" }),
  ],
  controllers: [VarientsController],
  providers: [VarientsService],
  exports: [VarientsService],
})
export class VarientsModule {}
