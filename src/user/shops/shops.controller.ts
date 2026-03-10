import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"; // adjust path as needed
import { User } from "../entities/user.entity";
import {
  CreateShopReviewDto,
  PaginatedResponse,
  PaginationQueryDto,
  SearchShopsQueryDto,
  ShopDetailResponse,
  ShopListItem,
  ShopReviewResponse,
} from "./dto/shop.dto";
import { ShopService } from "./externalService/shopService";

@Controller("shops")
export class ShopsController {
  constructor(private readonly _shopService: ShopService) {}

  /**
   * GET /shops
   * List all shops with name, logo, and address.
   * Supports filtering by: ?name=&city=&area=
   * Supports pagination: ?page=1&limit=10
   */
  @Get()
  async getShops(
    @Query() query: SearchShopsQueryDto,
    @GetUser("id") userId?: string
  ): Promise<PaginatedResponse<ShopListItem>> {
    return this._shopService.getShops(query, userId);
  }

  /**
   * GET /shops/:shopId
   * Full shop detail: info + address + products + reviews
   */
  @Get(":shopId")
  async getShopById(
    @Param("shopId", ParseIntPipe) shopId: number,
    @GetUser("id") userId?: string
  ): Promise<ShopDetailResponse> {
    return this._shopService.getShopById(shopId, userId);
  }

  /**
   * POST /shops/:shopId/reviews
   * Authenticated users leave a review for a shop
   */
  @Post(":shopId/reviews")
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param("shopId", ParseIntPipe) shopId: number,
    @Body() dto: CreateShopReviewDto,
    @GetUser() user: User
  ): Promise<{ message: string }> {
    await this._shopService.createReview(shopId, user, dto);
    return { message: "Review submitted successfully" };
  }

  /**
   * DELETE /shops/:shopId/reviews
   * Authenticated user deletes their own review
   */
  @Delete(":shopId/reviews")
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Param("shopId", ParseIntPipe) shopId: number,
    @GetUser("id") user: User
  ): Promise<{ message: string }> {
    await this._shopService.deleteReview(shopId, user.id);
    return { message: "Review deleted successfully" };
  }

  @Get(":shopId/reviews")
  async getShopReviews(
    @Param("shopId", ParseIntPipe) shopId: number,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResponse<ShopReviewResponse>> {
    return this._shopService.getShopReviews(shopId, query);
  }
}
