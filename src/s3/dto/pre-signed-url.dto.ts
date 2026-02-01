import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PrimaryPaths, S3_Field } from "../enums/primary-path.enum";

export class PreSignedUrlDTO {
  @ApiProperty({ required: true, description: "upload file name" })
  @MaxLength(500)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ required: true, description: "Primary path name of the files", enum: PrimaryPaths })
  @IsEnum(PrimaryPaths, {
    message: `primaryPath must be one of the following values: ${Object.values(PrimaryPaths).join(", ")}`,
  })
  @IsString()
  @IsNotEmpty()
  primaryPath: PrimaryPaths;

  @ApiProperty({ required: true, description: "S3 Field Name", enum: S3_Field })
  @IsEnum(S3_Field, {
    message: `field must be one of the following values: ${Object.values(S3_Field).join(", ")}`,
  })
  @IsString()
  @IsNotEmpty()
  field: S3_Field;

  @ApiPropertyOptional({ description: "no of secs for which the s3 url should be live" })
  @Max(900, { message: "URL can be live for maximum 15 mins or 900 secs" })
  @Min(60, { message: "URL must be live for 60 secs" })
  @IsPositive()
  @IsInt()
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => +value)
  expiresIn?: number;
}
