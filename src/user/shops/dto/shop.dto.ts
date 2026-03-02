import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

// ─── Query DTOs ────────────────────────────────────────────────────────────────

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class SearchShopsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;
}

export class CreateShopReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

// ─── Response DTOs ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FlatProduct {
  id: number;
  productName: string;
  price: number | null;
  image: string | null;
  shopName: string | null;
  discountPercentage: number | null;
  shopImage: string | null;
  reviews: number;
}

export interface ShopListItem {
  id: number;
  name: string | null;
  logo: string | null;
  address: {
    city: string | null;
    area: string | null;
  } | null;
}

export interface ShopReviewResponse {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface ShopDetailResponse {
  id: number;
  name: string | null;
  contactNumber: string | null;
  availableDays: string[];
  openingTime: string | null;
  closingTime: string | null;
  facebookLink: string | null;
  instagramLink: string | null;
  whatsappLink: string | null;
  banner: string | null;
  logo: string | null;
  address: {
    city: string | null;
    area: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  averageRating: number;
  totalReviews: number;
  reviews: ShopReviewResponse[];
  products: FlatProduct[];
}
