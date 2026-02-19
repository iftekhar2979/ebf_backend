import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ProductFeedService } from './feeds.service';

@Controller('feed')
@UseInterceptors(ClassSerializerInterceptor)
export class FeedController {
  constructor(private readonly feedService: ProductFeedService) {}

  /**
   * Get home feed with trending, discounted, and all products
   * GET /feed/home
   */
  @Get('home')
  async getHomeFeed(
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
      limit,
    };

    return this.feedService.getHomeFeed(filters, page || 1);
  }

  /**
   * Get trending products only
   * GET /feed/trending
   */
  @Get('trending')
  async getTrending(
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
    };

    return this.feedService.getTrendingProducts(filters, limit || 20, offset || 0);
  }

  /**
   * Get discounted products only
   * GET /feed/discounted
   */
  @Get('discounted')
  async getDiscounted(
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
    };

    return this.feedService.getDiscountedProducts(filters, limit || 20, offset || 0);
  }

  /**
   * Get new arrivals
   * GET /feed/new-arrivals
   */
  @Get('new-arrivals')
  async getNewArrivals(
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
    };

    return this.feedService.getNewArrivals(filters, limit || 20, offset || 0);
  }

  /**
   * Get category feed (trending + discounted + all from specific category)
   * GET /feed/category/:subCategoryId
   */
  @Get('category/:subCategoryId')
  async getCategoryFeed(
    @Query('subCategoryId', ParseIntPipe) subCategoryId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.feedService.getCategoryFeed(subCategoryId, page || 1, limit || 20);
  }

  /**
   * Search products
   * GET /feed/search
   */
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
    };

    return this.feedService.searchProducts(query, filters, page || 1, limit || 20);
  }

  /**
   * Get flash sale products (ending soon with high discounts)
   * GET /feed/flash-sale
   */
  @Get('flash-sale')
  async getFlashSale(
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
    };

    return this.feedService.getFlashSaleProducts(filters, limit || 20);
  }

  /**
   * Get personalized feed for user
   * GET /feed/personalized
   */
  @Get('personalized')
  async getPersonalized(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('subCategoryId', new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query('targetedGender') targetedGender?: string,
    @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters: FeedFilters = {
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
      limit,
    };

    return this.feedService.getPersonalizedFeed(userId, filters, page || 1);
  }
}