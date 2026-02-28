import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { ProductCacheService } from "../caches/caches.service";
import { Product } from "../entities/product.entity";
import { RankingsService } from "../rankings/rankings.service";
export interface FeedFilters {
  subCategoryId?: number;
  targetedGender?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface FlattenedProduct {
  id: number;
  productName: string;
  price: number | null;
  image: string | null;
  shopName: string | null;
  discountPercentage: number | null;
  reviews: number;
  rank?: number;
}

export interface FeedResponse {
  trending: FlattenedProduct[];
  discounted: FlattenedProduct[];
  allProducts: {
    data: FlattenedProduct[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private rankingService: RankingsService,
    private cacheService: ProductCacheService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  /**
   * Get home feed with trending, discounted, and all products
   */
  async getHomeFeed(filters: FeedFilters = {}, page: number = 1): Promise<FeedResponse> {
    // 1. Check cache first
    const cacheKey = `feed:home:${JSON.stringify(filters)}:${page}`;
    // const cached = await this.cacheService.getProductList(cacheKey);
    // if (cached) {
    //   this.logger.log("Returning home feed from cache");
    //   return cached;
    // }

    const limit = Math.min(filters.limit || 20, 100);

    // 2. Get product IDs from Redis sorted sets
    const [trendingIds, discountedIds] = await Promise.all([
      this.rankingService.getTrendingProducts({ limit: 20, offset: 0 }),
      this.rankingService.getDiscountedProducts({ limit: 20, offset: 0 }),
    ]);

    // 3. Fetch and flatten trending products
    const trending = await this.fetchAndFlattenProducts(trendingIds, filters);

    // 4. Fetch and flatten discounted products
    const discounted = await this.fetchAndFlattenProducts(discountedIds, filters);

    // 5. Fetch all products with pagination
    const allProducts = await this.getAllProducts(filters, page, limit);

    const result: FeedResponse = {
      trending,
      discounted,
      allProducts,
    };

    // 6. Cache the result
    await this.cacheService.setProductList(cacheKey, result);

    return result;
  }

  /**
   * Get trending products only
   */
  async getTrendingProducts(
    filters: FeedFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<FlattenedProduct[]> {
    const cacheKey = `feed:trending:${JSON.stringify(filters)}:${limit}:${offset}`;
    // const cached = await this.cacheService.getProductList(cacheKey);
    // if (cached) return cached;
    console.log(cacheKey);
    const productIds = await this.rankingService.getTrendingProducts({ limit, offset });
    const products = await this.fetchAndFlattenProducts(productIds, filters);

    await this.cacheService.setProductList(cacheKey, products);
    return products;
  }

  /**
   * Get discounted products only
   */
  async getDiscountedProducts(
    filters: FeedFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<FlattenedProduct[]> {
    const cacheKey = `feed:discounted:${JSON.stringify(filters)}:${limit}:${offset}`;
    const cached = await this.cacheService.getProductList(cacheKey);
    if (cached) return cached;

    const productIds = await this.rankingService.getDiscountedProducts({ limit, offset });
    const products = await this.fetchAndFlattenProducts(productIds, filters);

    await this.cacheService.setProductList(cacheKey, products);
    return products;
  }

  /**
   * Get new arrival products
   */
  async getNewArrivals(
    filters: FeedFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<FlattenedProduct[]> {
    const cacheKey = `feed:new-arrivals:${JSON.stringify(filters)}:${limit}:${offset}`;
    const cached = await this.cacheService.getProductList(cacheKey);
    console.log("Cached");
    if (cached) return cached;
    const productIds = await this.rankingService.getNewArrivals(limit, offset);
    const products = await this.fetchAndFlattenProducts(productIds, filters);

    await this.cacheService.setProductList(cacheKey, products);
    return products;
  }

  /**
   * Fetch products by IDs and flatten them
   */
  private async fetchAndFlattenProducts(
    productIds: number[],
    filters: FeedFilters
  ): Promise<FlattenedProduct[]> {
    if (productIds.length === 0) return [];

    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "product.images",
        "image",
        `image.id = (
          SELECT pi.id FROM product_images pi 
          WHERE pi."productId" = product.id 
          AND pi."deletedAt" IS NULL
          ORDER BY pi.id ASC 
          LIMIT 1
        )`
      )
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
          SELECT pv.id FROM product_varients pv
          WHERE pv."productId" = product.id
          LIMIT 1
        )`
      )
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .select([
        "product.id",
        "product.productName",
        "product.discountPercentage",
        "product.price",
        "image.id",
        "image.image",
        "shopProfile.name",
        "shopProfile.logo",
      ])
      .where("product.id IN (:...productIds)", { productIds });
    console.log(queryBuilder);
    // Apply filters
    this.applyFilters(queryBuilder, filters);

    const products = await queryBuilder.getMany();
    console.log(products);
    // Maintain the order from productIds
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = productIds.map((id) => productMap.get(id)).filter((p) => p !== undefined);

    return this.flattenProducts(orderedProducts);
  }

  /**
   * Get all products with pagination
   */
  private async getAllProducts(
    filters: FeedFilters,
    page: number,
    limit: number
  ): Promise<{
    data: FlattenedProduct[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "product.images",
        "image",
        `image.id = (
          SELECT pi.id FROM product_images pi 
          WHERE pi."productId" = product.id 
          AND pi."deletedAt" IS NULL
          ORDER BY pi.id ASC 
          LIMIT 1
        )`
      )
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
          SELECT pv.id FROM product_varients pv
          WHERE pv."productId" = product.id
          LIMIT 1
        )`
      )
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .select([
        "product.id",
        "product.productName",
        "product.discountPercentage",
        "image.id",
        "image.image",
        "product.price",
        "shopProfile.name",
        "user",
      ]);

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    const [products, total] = await queryBuilder
      .orderBy("product.id", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: this.flattenProducts(products),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(queryBuilder: any, filters: FeedFilters): void {
    if (filters.subCategoryId) {
      queryBuilder.andWhere("product.subCategoryId = :subCategoryId", {
        subCategoryId: filters.subCategoryId,
      });
    }

    if (filters.targetedGender) {
      queryBuilder.andWhere("product.targetedGender = :targetedGender", {
        targetedGender: filters.targetedGender,
      });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere("variant.price >= :minPrice", {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere("variant.price <= :maxPrice", {
        maxPrice: filters.maxPrice,
      });
    }
  }

  /**
   * Flatten products to simplified format
   */
  private flattenProducts(products: Product[]): FlattenedProduct[] {
    return products.map((product) => ({
      id: product.id,
      productName: product.productName,
      price: product.price || null,
      image: product.images?.[0]?.image || null,
      shopName: product.user?.shopProfile?.name || null,
      discountPercentage: product.discountPercentage,
      shopImage: product.user.image,
      reviews: 4, // TODO: Get from reviews table
    }));
  }

  /**
   * Get personalized feed based on user preferences
   */
  async getPersonalizedFeed(
    userId: number,
    filters: FeedFilters = {},
    page: number = 1
  ): Promise<FeedResponse> {
    // TODO: Implement personalization based on:
    // - User's past orders
    // - User's wishlists
    // - User's cart items
    // - User's viewed products
    // - User's preferred categories

    // For now, return general feed
    return this.getHomeFeed(filters, page);
  }

  /**
   * Get products by category with ranking
   */
  async getCategoryFeed(
    subCategoryId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    trending: FlattenedProduct[];
    discounted: FlattenedProduct[];
    all: {
      data: FlattenedProduct[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
  }> {
    const filters: FeedFilters = { subCategoryId, limit };

    const cacheKey = `feed:category:${subCategoryId}:${page}`;
    const cached = await this.cacheService.getProductList(cacheKey);
    if (cached) return cached;

    const [trending, discounted, all] = await Promise.all([
      this.getTrendingProducts(filters, 10),
      this.getDiscountedProducts(filters, 10),
      this.getAllProducts(filters, page, limit),
    ]);

    const result = { trending, discounted, all };
    await this.cacheService.setProductList(cacheKey, result);

    return result;
  }

  /**
   * Search products with ranking
   */
  async searchProducts(
    searchQuery: string,
    filters: FeedFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: FlattenedProduct[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "product.images",
        "image",
        `image.id = (
          SELECT pi.id FROM product_images pi 
          WHERE pi."productId" = product.id 
          AND pi."deletedAt" IS NULL
          ORDER BY pi.id ASC 
          LIMIT 1
        )`
      )
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
          SELECT pv.id FROM product_varients pv
          WHERE pv."productId" = product.id
          ORDER BY pv.price ASC
          LIMIT 1
        )`
      )
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .leftJoin("product.stats", "stats")
      .select([
        "product.id",
        "product.productName",
        "product.discountPercentage",
        "image.id",
        "image.image",
        "variant.price",
        "shopProfile.name",
        "stats.viewCount",
      ])
      .where("(product.productName ILIKE :search OR product.description ILIKE :search)", {
        search: `%${searchQuery}%`,
      });

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    const [products, total] = await queryBuilder
      .orderBy("stats.viewCount", "DESC") // Order by popularity
      .addOrderBy("product.id", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: this.flattenProducts(products),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get flash sale products (highest discounts, ending soon)
   */
  async getFlashSaleProducts(filters: FeedFilters = {}, limit: number = 20): Promise<FlattenedProduct[]> {
    const cacheKey = `feed:flash-sale:${JSON.stringify(filters)}:${limit}`;
    const cached = await this.cacheService.getProductList(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "product.images",
        "image",
        `image.id = (
          SELECT pi.id FROM product_images pi 
          WHERE pi."productId" = product.id 
          AND pi."deletedAt" IS NULL
          ORDER BY pi.id ASC 
          LIMIT 1
        )`
      )
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
          SELECT pv.id FROM product_varients pv
          WHERE pv."productId" = product.id
          ORDER BY pv.price ASC
          LIMIT 1
        )`
      )
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .select([
        "product.id",
        "product.productName",
        "product.discountPercentage",
        "product.discountEndDate",
        "image.id",
        "image.image",
        "variant.price",
        "shopProfile.name",
      ])
      .where("product.discountPercentage IS NOT NULL")
      .andWhere("product.discountStartDate <= :now", { now })
      .andWhere("product.discountEndDate >= :now", { now })
      .andWhere("product.discountEndDate <= :twentyFourHours", {
        twentyFourHours: twentyFourHoursLater,
      });

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    const products = await queryBuilder
      .orderBy("product.discountPercentage", "DESC")
      .addOrderBy("product.discountEndDate", "ASC")
      .take(limit)
      .getMany();

    const result = this.flattenProducts(products);
    await this.cacheService.setProductList(cacheKey, result);

    return result;
  }
}
