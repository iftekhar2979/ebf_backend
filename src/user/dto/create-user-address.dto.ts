import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, MinLength, MaxLength } from "class-validator";

export class CreateUserAddressDto {
  @ApiProperty({ example: "221B Baker Street" })
  @IsString()
  address: string;

  @ApiProperty({ example: "221B" })
  @IsString()
  house_number: string;

  @ApiProperty({ example: "Apartment 4A", required: false })
  @IsOptional()
  @IsString()
  address_2?: string;

  @ApiProperty({ example: "London" })
  @IsString()
  city: string;

  @ApiProperty({ example: "GB" })
  @IsString()
  @MaxLength(5, { message: "Country should contains only iso code " })
  @MinLength(2, { message: "Country should contains only iso code " })
  country: string;

  @ApiProperty({ example: "NW1 6XE" })
  @IsString()
  postal_code: string;

  @ApiProperty({ example: "England", required: false })
  @IsOptional()
  @IsString()
  country_state?: string;

  @ApiProperty({ example: 51.523767, description: "Latitude coordinate", required: false })
  @IsOptional()
  @IsNumber({}, { message: "Latitude must be a valid number" })
  latitude?: number;

  @ApiProperty({ example: -0.1585557, description: "Longitude coordinate", required: false })
  @IsOptional()
  @IsNumber({}, { message: "Longitude must be a valid number" })
  longitude?: number;
}
