import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from './categories/categories.module';
import { SubCategoriesService } from './sub_categories/sub_categories.service';
import { SubCategoriesModule } from './sub_categories/sub_categories.module';
import { ViewsModule } from './views/views.module';
import { VarientsService } from './varients/varients.service';
import { VarientsModule } from './varients/varients.module';
import { SizesModule } from './sizes/sizes.module';
import { ColorsModule } from './colors/colors.module';
import { RanksModule } from './ranks/ranks.module';
import { ImagesModule } from './images/images.module';
import { BoostsService } from './boosts/boosts.service';
import { BoostsModule } from './boosts/boosts.module';
import { StatsModule } from './stats/stats.module';
import { EventsModule } from './events/events.module';
import { GlobalStatsModule } from './global_stats/global_stats.module';
import { CachesModule } from './caches/caches.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService,],
  imports: [TypeOrmModule.forFeature([Product]),CategoriesModule, SubCategoriesModule, ViewsModule, VarientsModule, SizesModule, ColorsModule, RanksModule, ImagesModule, BoostsModule, StatsModule, EventsModule, GlobalStatsModule, CachesModule]
})
export class ProductsModule {}
