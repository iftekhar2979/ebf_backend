import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubCategory } from './entities/sub_categories.entity';
import { Category } from '../categories/entities/categories.entity';
import { Product } from '../entities/product.entity';
import { SubCategoriesController } from './sub_categoires.controller';
import { SubCategoriesService } from './sub_categories.service';

@Module({
     imports: [TypeOrmModule.forFeature([SubCategory, Category, Product])],
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService],
  exports: [SubCategoriesService],
})
export class SubCategoriesModule {

     
}
