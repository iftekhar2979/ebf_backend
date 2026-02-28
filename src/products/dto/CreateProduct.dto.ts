import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { TargetedGender } from "../entities/product.entity";
import { CreateVariantDto } from "./CreateVarient.dto";

export class CreateProductDto {
  @IsString()
  productName: string;

  @IsString()
  description: string;

  @IsEnum(TargetedGender)
  targetedGender: TargetedGender;

  @IsNumber()
  subCategoryId: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountDays?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  images: string[];

  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @ArrayMinSize(1)
  variants: CreateVariantDto[];
}
