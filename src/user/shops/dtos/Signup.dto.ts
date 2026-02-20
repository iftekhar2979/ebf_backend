import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Matches,
  MinLength,
  MaxLength,
  IsUrl,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ShopSignupDto {
  @ApiProperty({ example: "John Doe", description: "Full name of the shop owner" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "shop@example.com", description: "Email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "+8801712345678", description: "Phone number" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?\d{1,3}[- ]?)?\d{10,}$/, {
    message: "Phone number must be valid",
  })
  phoneNumber: string;

  @ApiProperty({ example: "123 Main St, Shop #5", description: "Shop address" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  shopAddress: string;

  @ApiProperty({ example: 24.3636, description: "Latitude coordinate" })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 88.6241, description: "Longitude coordinate" })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ example: "Rajshahi", description: "City name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: "6000", description: "Postal code" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: "Shaheb Bazar", description: "Area/locality name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  area: string;

  @ApiProperty({ example: "09:00", description: "Opening time in HH:mm format" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Opening time must be in HH:mm format",
  })
  openingTime: string;

  @ApiProperty({ example: "21:00", description: "Closing time in HH:mm format" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Closing time must be in HH:mm format",
  })
  closingTime: string;

  @ApiProperty({
    example: "https://facebook.com/myshop",
    description: "Facebook page link",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  facebookLink?: string;

  @ApiProperty({
    example: "https://instagram.com/myshop",
    description: "Instagram profile link",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  instagramLink?: string;

  @ApiProperty({
    example: "https://example.com/banner.jpg",
    description: "Banner image URL",
    required: false,
  })
  @IsOptional()
  @IsString()
  banner?: string;

  @ApiProperty({ example: "SecurePass123!", description: "Password (min 8 characters)" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;
}
