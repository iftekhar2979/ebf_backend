import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductBoosting } from "../boosts/entities/boosts.entity";
import { CachesModule } from "../caches/caches.module";
import { Product } from "../entities/product.entity";
import { ProductStat } from "../stats/entities/product_stats.entity";
import { RankingsController } from "./rankings.controller";
import { RankingsService } from "./rankings.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductStat, ProductBoosting]), CachesModule],
  providers: [RankingsService],
  controllers: [RankingsController],
  exports: [RankingsService],
})
export class RankingsModule {}
