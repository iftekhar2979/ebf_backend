// dto/get-users-query.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsString } from "class-validator";
import { USER_STATUS } from "../entities/user.entity";

export class GetUsersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @ApiPropertyOptional({ description: "Search by name (first or last)" })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ description: "Search by name (first or last)" })
  @IsOptional()
  @IsString()
  status?: USER_STATUS;
}
