import { Module } from "@nestjs/common";
import { ColorsController } from "./colors.controller";
import { ColorsService } from "./colors.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductColor } from "./entities/colors.entity";
import { ProductVariant } from "../varients/entities/varients.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProductColor, ProductVariant])],
  controllers: [ColorsController],
  providers: [ColorsService],
})
export class ColorsModule {}
