import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PRODUCT_PROCESSORS } from "src/bull/processors/product/types/types";
import { BoostsModule } from "./boosts/boosts.module";
import { CachesModule } from "./caches/caches.module";
import { CategoriesModule } from "./categories/categories.module";
import { Product } from "./entities/product.entity";
import { EventsModule } from "./events/events.module";
import { GlobalStatsModule } from "./global_stats/global_stats.module";
import { ImagesModule } from "./images/images.module";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { RankingsModule } from "./rankings/rankings.module";
import { RanksModule } from "./ranks/ranks.module";
import { StatsModule } from "./stats/stats.module";
import { SubCategoriesModule } from "./sub_categories/sub_categories.module";
import { VarientsModule } from "./varients/varients.module";
import { ViewsModule } from "./views/views.module";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    TypeOrmModule.forFeature([Product]),
    BullModule.registerQueue({ name: PRODUCT_PROCESSORS.PROCESSOR }),
    CategoriesModule,
    SubCategoriesModule,
    ViewsModule,
    VarientsModule,
    RanksModule,
    ImagesModule,
    BoostsModule,
    StatsModule,
    EventsModule,
    GlobalStatsModule,
    CachesModule,
    RankingsModule,
  ],
})
export class ProductsModule {}
