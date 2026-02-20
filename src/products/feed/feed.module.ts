import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CachesModule } from "../caches/caches.module";
import { Product } from "../entities/product.entity";
import { RankingsModule } from "../rankings/rankings.module";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

@Module({
  imports: [TypeOrmModule.forFeature([Product]), CachesModule, RankingsModule],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
