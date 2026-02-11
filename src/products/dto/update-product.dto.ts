import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductDto, CreateProductVariantDto } from './create-product.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, [ 'variants', 'images'] as const),
) {}

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
  @IsInt()
  @IsOptional()
  id?: number; // For updating existing variants
}