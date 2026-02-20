import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateSubCategoryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
