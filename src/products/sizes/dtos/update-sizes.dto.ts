import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSizeDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  type?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  desc?: string;
}