import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  image?: string;
}
