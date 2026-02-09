import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateSizeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  desc: string;
}