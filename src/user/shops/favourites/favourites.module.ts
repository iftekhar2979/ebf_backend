import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ShopProfile } from "../entities/shop.entity";
import { FavouriteShop } from "./entities/favourite.entity";
import { FavouritesController } from "./favourites.controller";
import { FavouritesService } from "./favourites.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([FavouriteShop, ShopProfile]),
    // AuthModule,
  ],
  controllers: [FavouritesController],
  providers: [FavouritesService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
