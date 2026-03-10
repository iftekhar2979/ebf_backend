import { ApiProperty } from "@nestjs/swagger";
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min,
} from "class-validator";

export class CreateProductReviewDto {
  @ApiProperty({ example: 4.5, description: "Rating between 1 and 5" })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({ example: "Great product!", description: "Review comment" })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    example: ["https://s3.bucket/image1.jpg"],
    description: "Array of image URLs uploaded to S3",
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];
}
