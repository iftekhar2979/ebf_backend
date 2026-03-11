import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Repository } from "typeorm";
import { Logger } from "winston";
import { ProductCacheService } from "../caches/caches.service";
import { Product } from "../entities/product.entity";

export interface RecommendedProduct {
  id: number;
  productName: string;
  price: number;
  discountPercentage: number | null;
  targetedGender: string;
  image: string | null;
  shopName: string | null;
  discount: number | null;
}

/**
 * ProductRecommendationsService — SRP compliant service.
 *
 * Responsible exclusively for building and caching product recommendations.
 * Uses a 3-strategy waterfall:
 *   1. Same sub-category + same gender  (highest relevance)
 *   2. Same sub-category, any gender    (medium relevance)
 *   3. Similar price range ±40%         (price-bracket fallback)
 *
 * Each strategy only fetches the slots not already filled by the previous one,
 * guaranteeing at least `limit` results as long as the catalogue has enough products.
 */
@Injectable()
export class ProductRecommendationsService {
  private readonly RECOMMENDATION_TTL = 600; // 10 minutes
  private readonly DEFAULT_LIMIT = 5;
  private readonly PRICE_TOLERANCE = 0.4; // ±40%

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: ProductCacheService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns at least `limit` recommendations for the given product.
   * Results are cached per product with a 10-minute TTL.
   */
  async getRecommendations(
    product: Pick<Product, "id" | "subCategoryId" | "targetedGender" | "price">,
    limit = this.DEFAULT_LIMIT
  ): Promise<RecommendedProduct[]> {
    const cacheKey = this.getCacheKey(product.id, limit);

    const cached = await this.cacheService.getRecommendations(cacheKey);
    if (cached) {
      this.logger.debug(`[Recommendations] Cache hit for product ${product.id}`);
      return cached;
    }

    const recommendations = await this.buildRecommendations(product, limit);

    await this.cacheService.setRecommendations(cacheKey, recommendations, this.RECOMMENDATION_TTL);
    return recommendations;
  }

  /**
   * Invalidates the recommendation cache for a given product.
   * Should be called when a product in the same subCategory is created/updated/deleted.
   */
  async invalidateBySubCategory(subCategoryId: number): Promise<void> {
    const pattern = `product:recommendations:subcat:${subCategoryId}:*`;
    await this.cacheService.invalidateByPattern(pattern);
    this.logger.debug(`[Recommendations] Invalidated cache for subCategory ${subCategoryId}`);
  }

  async invalidateForProduct(productId: number): Promise<void> {
    const pattern = `product:recommendations:${productId}:*`;
    await this.cacheService.invalidateByPattern(pattern);
  }

  // ─── Private: waterfall query builder ────────────────────────────────────

  private async buildRecommendations(
    product: Pick<Product, "id" | "subCategoryId" | "targetedGender" | "price">,
    limit: number
  ): Promise<RecommendedProduct[]> {
    let results: RecommendedProduct[] = [];

    // 🔵 Strategy 1 – same sub-category + same gender
    results = await this.queryRecommendations({
      excludeIds: [product.id],
      subCategoryId: product.subCategoryId,
      gender: product.targetedGender,
      limit,
    });

    // 🟡 Strategy 2 – same sub-category, any gender
    if (results.length < limit) {
      const extra = await this.queryRecommendations({
        excludeIds: [product.id, ...results.map((p) => p.id)],
        subCategoryId: product.subCategoryId,
        limit: limit - results.length,
      });
      results = [...results, ...extra];
    }

    // 🔴 Strategy 3 – similar price range (fallback)
    if (results.length < limit) {
      const priceRange = Number(product.price) * this.PRICE_TOLERANCE;
      const extra = await this.queryRecommendations({
        excludeIds: [product.id, ...results.map((p) => p.id)],
        minPrice: Math.max(0, Number(product.price) - priceRange),
        maxPrice: Number(product.price) + priceRange,
        limit: limit - results.length,
      });
      results = [...results, ...extra];
    }

    return results;
  }

  private async queryRecommendations(params: {
    excludeIds: number[];
    subCategoryId?: number;
    gender?: string;
    minPrice?: number;
    maxPrice?: number;
    limit: number;
  }): Promise<RecommendedProduct[]> {
    const { excludeIds, subCategoryId, gender, minPrice, maxPrice, limit } = params;

    // Use a constant placeholder so the NOT IN clause is always valid
    const safeExcludes = excludeIds.length > 0 ? excludeIds : [-1];

    const qb = this.productRepository
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
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
          SELECT pv.id FROM product_varients pv
          WHERE pv."productId" = product.id
          LIMIT 1
        )`
      )
      .select([
        "product.id",
        "product.productName",
        "product.price",
        "product.discountPercentage",
        "product.targetedGender",
        "image.id",
        "image.image",
        "shopProfile.name",
        "variant.discount",
      ])
      .where("product.id NOT IN (:...excludeIds)", { excludeIds: safeExcludes })
      .orderBy("product.id", "DESC")
      .take(limit);

    if (subCategoryId !== undefined) {
      qb.andWhere("product.subCategoryId = :subCategoryId", { subCategoryId });
    }
    if (gender !== undefined) {
      qb.andWhere("product.targetedGender = :gender", { gender });
    }
    if (minPrice !== undefined && maxPrice !== undefined) {
      qb.andWhere("product.price BETWEEN :minPrice AND :maxPrice", { minPrice, maxPrice });
    }

    const products = await qb.getMany();

    return products.map((p) => ({
      id: p.id,
      productName: p.productName,
      price: p.price,
      discountPercentage: p.discountPercentage ?? null,
      targetedGender: p.targetedGender,
      image: p.images?.[0]?.image ?? null,
      shopName: (p as any).user?.shopProfile?.name ?? null,
      discount: p.variants?.[0]?.discount ?? null,
    }));
  }

  // ─── Cache key helper ─────────────────────────────────────────────────────

  private getCacheKey(productId: number, limit: number): string {
    return `product:recommendations:${productId}:limit:${limit}`;
  }
}
