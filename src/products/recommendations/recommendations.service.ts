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
 *
 * Uses a 3-strategy PARALLEL approach (all 3 queries fire simultaneously):
 *   1. Same sub-category + same gender  (highest priority)
 *   2. Same sub-category, any gender    (medium priority)
 *   3. Similar price range ±40%         (price-bracket fallback)
 *
 * Results are merged in-memory with deduplication, preserving priority order.
 * This gives us 1 DB round-trip (3 parallel queries) instead of up to 3 sequential ones.
 */
@Injectable()
export class ProductRecommendationsService {
  private readonly RECOMMENDATION_TTL = 600; // 10 minutes
  private readonly DEFAULT_LIMIT = 5;
  private readonly PRICE_TOLERANCE = 0.4; // ±40%
  /** Overfetch per strategy so we have enough after dedup */
  private readonly OVERFETCH_MULTIPLIER = 2;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: ProductCacheService,
    @InjectLogger() private readonly logger: Logger
  ) {}

  // ─── Public API ───────────────────────────────────────────────────────────

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

  async invalidateBySubCategory(subCategoryId: number): Promise<void> {
    const pattern = `product:recommendations:subcat:${subCategoryId}:*`;
    await this.cacheService.invalidateByPattern(pattern);
    this.logger.debug(`[Recommendations] Invalidated cache for subCategory ${subCategoryId}`);
  }

  async invalidateForProduct(productId: number): Promise<void> {
    const pattern = `product:recommendations:${productId}:*`;
    await this.cacheService.invalidateByPattern(pattern);
  }

  // ─── Private: all 3 strategies fired in parallel ─────────────────────────

 async buildRecommendations(
  product: Pick<Product, "id" | "subCategoryId" | "targetedGender" | "price">,
  limit: number
): Promise<RecommendedProduct[]> {

  const priceRange = Number(product.price) * this.PRICE_TOLERANCE;

  const minPrice = Math.max(0, Number(product.price) - priceRange);
  const maxPrice = Number(product.price) + priceRange;

  return this.queryRecommendations({
    productId: product.id,
    subCategoryId: product.subCategoryId,
    gender: product.targetedGender,
    minPrice,
    maxPrice,
    limit
  });
}

  /**
   * Deduplication in O(n) using a Set.
   * Preserves insertion order so priority-ordered input is respected.
   */
  private deduplicateAndTake(
    items: RecommendedProduct[],
    excludeIds: number[],
    limit: number
  ): RecommendedProduct[] {
    const seen = new Set<number>(excludeIds);
    const result: RecommendedProduct[] = [];

    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
      if (result.length === limit) break;
    }

    return result;
  }


 private async queryRecommendations(params: {
  productId: number;
  subCategoryId: number;
  gender: string;
  minPrice: number;
  maxPrice: number;
  limit: number;
}): Promise<RecommendedProduct[]> {

  const { productId, subCategoryId, gender, minPrice, maxPrice, limit } = params;

  const products = await this.productRepository
    .createQueryBuilder("p")

    .leftJoin("p.user", "u")
    .leftJoin("u.shopProfile", "shopProfile")

    // first image
    .leftJoin(
      "p.images",
      "image",
      `image.id = (
        SELECT pi.id
        FROM product_images pi
        WHERE pi."productId" = p.id
        AND pi."deletedAt" IS NULL
        ORDER BY pi.id ASC
        LIMIT 1
      )`
    )

    // first variant
    .leftJoin(
      "p.variants",
      "variant",
      `variant.id = (
        SELECT pv.id
        FROM product_varients pv
        WHERE pv."productId" = p.id
        LIMIT 1
      )`
    )

    .select([
      "p.id",
      "p.productName",
      "p.price",
      "p.discountPercentage",
      "p.targetedGender",
      "image.image",
      "variant.discount",
      "shopProfile.name"
    ])

    // ranking priority
    .addSelect(`
      CASE
        WHEN p."subCategoryId" = :subCat AND p."targetedGender" = :gender THEN 1
        WHEN p."subCategoryId" = :subCat THEN 2
        WHEN p.price BETWEEN :minPrice AND :maxPrice THEN 3
        ELSE 4
      END
    `, "priority")

    .where("p.id != :productId", { productId })

    .orderBy("priority", "ASC")
    .addOrderBy("p.id", "DESC")

    .limit(limit)

    .setParameters({
      subCat: subCategoryId,
      gender,
      minPrice,
      maxPrice
    })

    .getRawMany();

  return products.map((p) => ({
    id: p.p_id,
    productName: p.p_productName,
    price: p.p_price,
    discountPercentage: p.p_discountPercentage,
    targetedGender: p.p_targetedGender,
    image: p.image_image ?? null,
    shopName: p.shopProfile_name ?? null,
    discount: p.variant_discount ?? null
  }));
}

  // ─── Cache key helper ─────────────────────────────────────────────────────

  private getCacheKey(productId: number, limit: number): string {
    return `product:recommendations:${productId}:limit:${limit}`;
  }
}
