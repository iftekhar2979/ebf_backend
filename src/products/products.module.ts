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

@Module({
  controllers: [ProductsController],
  providers: [ProductsService,],
  imports: [CategoriesModule, SubCategoriesModule, ViewsModule, VarientsModule, SizesModule, ColorsModule, RanksModule, ImagesModule, BoostsModule, StatsModule]
})
export class ProductsModule {}
