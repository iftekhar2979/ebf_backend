import { IsString, IsOptional, MaxLength, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSubCategoryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  categoryId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
