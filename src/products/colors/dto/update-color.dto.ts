import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateColorDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  image?: string;
}