import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { TargetedGender } from "../entities/product.entity";
import { CreateVariantDto } from "./CreateVarient.dto";

export class CreateProductVariantDto {
  @IsInt()
  @IsNotEmpty()
  size: string;

  @IsInt()
  @IsNotEmpty()
  colorHex: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  sku: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(100)
  unit: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discount?: number;
}

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  image: string; // URL or file path
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  productName: string;

  @IsEnum(TargetedGender)
  @IsNotEmpty()
  targetedGender: TargetedGender;

  @IsInt()
  @IsNotEmpty()
  subCategoryId: number;

  @IsString()
  @IsOptional()
  @Length(0, 5000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @IsDateString()
  @IsOptional()
  discountStartDate?: string;

  @IsDateString()
  @IsOptional()
  discountEndDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @IsArray()
  @ArrayMinSize(2, { message: "Minimum 2 images required" })
  @ArrayMaxSize(5, { message: "Maximum 5 images allowed" })
  @ValidateNested({ each: true })
  // @Type(() => )
  images: string[];
}
