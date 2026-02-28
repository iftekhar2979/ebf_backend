import { Type } from "class-transformer";
import { ArrayMinSize, IsString, ValidateNested } from "class-validator";
import { CreateSizeDto } from "./CreateSize.dto";

export class CreateVariantDto {
  @IsString()
  color_hex: string;

  @ValidateNested({ each: true })
  @Type(() => CreateSizeDto)
  @ArrayMinSize(1)
  sizes: CreateSizeDto[];
}
