import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ReelStatus } from "../entities/reels.entity";

export class CreateReelDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsEnum(ReelStatus)
  @IsOptional()
  status?: ReelStatus;
}
