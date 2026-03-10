import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { Product } from "src/products/entities/product.entity";
import { RedisModule } from "src/redis/redis.module";
import { UserModule } from "src/user/user.module";
import { ProductReviewImage } from "./entities/product-review-image.entity";
import { ProductReview } from "./entities/product-review.entity";
import { ProductReviewsController } from "./product-reviews.controller";
import { ProductReviewsService } from "./product-reviews.service";
import { ProductReviewRepository } from "./repositories/product-review.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductReview, ProductReviewImage, Product]),
    RedisModule,
    AuthModule,
    UserModule,
  ],
  providers: [ProductReviewRepository, ProductReviewsService],
  controllers: [ProductReviewsController],
  exports: [ProductReviewsService],
})
export class ProductReviewsModule {}
