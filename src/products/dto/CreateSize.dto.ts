import { IsInt, IsString, Min } from "class-validator";

export class CreateSizeDto {
  @IsString()
  size: string;

  @IsInt()
  @Min(0)
  stock: number;
}
