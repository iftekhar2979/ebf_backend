import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { BoostsService, CreateBoostDto } from "./boosts.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { IsInt, IsPositive, Min, Max, IsNumber } from "class-validator";
import { Type } from "class-transformer";

// DTOs
export class CreateBoostRequestDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  boostScore: number;

  @IsInt()
  @Min(1)
  @Max(365)
  durationDays: number;
}

export class PaginationQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;
}

export class TopBoostedQueryDto {
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit: number = 100;
}

@ApiTags("Product Boosts")
@Controller("boosts")
export class BoostsController {
  constructor(private readonly boostsService: BoostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new product boost" })
  @ApiResponse({ status: 201, description: "Boost created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input or product already boosted" })
  @ApiResponse({ status: 429, description: "Rate limit exceeded" })
  @ApiBearerAuth()
  async createBoost(
    @Body() dto: CreateBoostRequestDto
    // @CurrentUser() user: User, // Assuming you have a user decorator
  ) {
    // For demo, using a placeholder userId
    const userId = "user-123"; // Replace with actual user from auth guard

    return this.boostsService.createBoost({
      ...dto,
      userId,
    });
  }

  @Get("product/:productId/active")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get active boost for a product" })
  @ApiResponse({ status: 200, description: "Active boost retrieved successfully" })
  @ApiResponse({ status: 404, description: "No active boost found" })
  async getActiveBoost(@Param("productId", ParseIntPipe) productId: number) {
    const boost = await this.boostsService.getActiveBoostByProduct(productId);

    if (!boost) {
      return {
        productId,
        hasActiveBoost: false,
        boost: null,
      };
    }

    return {
      productId,
      hasActiveBoost: true,
      boost,
    };
  }

  @Get("product/:productId/score")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current boost score for a product (for ranking)" })
  @ApiResponse({ status: 200, description: "Boost score retrieved successfully" })
  async getBoostScore(@Param("productId", ParseIntPipe) productId: number) {
    const score = await this.boostsService.getBoostScore(productId);

    return {
      productId,
      boostScore: score,
    };
  }

  @Get("product/:productId/history")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get boost history for a product" })
  @ApiResponse({ status: 200, description: "Boost history retrieved successfully" })
  async getBoostHistory(
    @Param("productId", ParseIntPipe) productId: number,
    @Query() query: PaginationQueryDto
  ) {
    return this.boostsService.getProductBoostHistory(productId, query.page, query.limit);
  }

  @Get("product/:productId/analytics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get boost analytics for a product" })
  @ApiResponse({ status: 200, description: "Analytics retrieved successfully" })
  async getBoostAnalytics(@Param("productId", ParseIntPipe) productId: number) {
    return this.boostsService.getBoostAnalytics(productId);
  }

  @Get("top-boosted")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get top boosted products" })
  @ApiResponse({ status: 200, description: "Top boosted products retrieved successfully" })
  async getTopBoostedProducts(@Query() query: TopBoostedQueryDto) {
    return this.boostsService.getTopBoostedProducts(query.limit);
  }

  @Patch(":boostId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel an active boost" })
  @ApiResponse({ status: 200, description: "Boost cancelled successfully" })
  @ApiResponse({ status: 400, description: "Boost is already inactive" })
  @ApiResponse({ status: 404, description: "Boost not found" })
  @ApiBearerAuth()
  async cancelBoost(
    @Param("boostId", ParseIntPipe) boostId: number
    // @CurrentUser() user: User,
  ) {
    const userId = "user-123"; // Replace with actual user

    return this.boostsService.cancelBoost(boostId, userId);
  }
}
