import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../entities/product.entity";
import { StatsModule } from "../stats/stats.module";
import { ProductLike } from "./entities/product-like.entity";
import { LikesController } from "./likes.controller";
import { LikesService } from "./likes.service";

@Module({
  imports: [TypeOrmModule.forFeature([ProductLike, Product]), StatsModule],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
