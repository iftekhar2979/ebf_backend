import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { SHOP_CACHE_KEYS, SHOP_CACHE_TTL } from "../constants/shop.cache.contants";
import {
    CreateShopReviewDto,
    PaginatedResponse,
    SearchShopsQueryDto,
    ShopDetailResponse,
    ShopListItem,
} from "../dto/shop.dto";
import { ShopMapper } from "../mapper/shop.mapper";
import { ShopRepository } from "../shop.repository";

@Injectable()
export class ShopService {
  private readonly _logger = new Logger(ShopService.name);

  constructor(
    private readonly _shopRepository: ShopRepository,
    private readonly _redisService: RedisService
  ) {}

  // ─── Get Single Shop (full detail) ────────────────────────────────────────

  async getShopById(shopId: number): Promise<ShopDetailResponse> {
    const cacheKey = SHOP_CACHE_KEYS.shopDetail(shopId);

    // 1. Try cache
    const cached = await this._tryGetCache<ShopDetailResponse>(cacheKey);
    if (cached) return cached;

    // 2. Fetch shop base info
    const shop = await this._shopRepository.findShopById(shopId);
    if (!shop) throw new NotFoundException(`Shop with id ${shopId} not found`);

    // 3. Fetch products + reviews in parallel
    const [[rawProducts], rawReviews, averageRating] = await Promise.all([
      this._shopRepository.findProductsByShopUserId(shop.userId, 1, 20),
      this._shopRepository.findReviewsByShopId(shopId),
      this._shopRepository.getAverageRating(shopId),
    ]);

    // 4. Map to response shapes
    const products = rawProducts.map(ShopMapper.toFlatProduct);
    const reviews = rawReviews.map(ShopMapper.toShopReviewResponse);

    const result = ShopMapper.toShopDetail(shop, products, reviews, averageRating);

    // 5. Cache result
    await this._trySetCache(cacheKey, result, SHOP_CACHE_TTL.SHOP_DETAIL);

    return result;
  }

  // ─── Get All Shops (list with search/filter) ──────────────────────────────

  async getShops(query: SearchShopsQueryDto): Promise<PaginatedResponse<ShopListItem>> {
    const { page, limit, name, city, area } = query;

    const hasFilter = !!(name || city || area);
    const cacheKey = hasFilter
      ? SHOP_CACHE_KEYS.shopSearch(name, city, area, page, limit)
      : SHOP_CACHE_KEYS.shopList(page, limit);

    const ttl = hasFilter ? SHOP_CACHE_TTL.SHOP_SEARCH : SHOP_CACHE_TTL.SHOP_LIST;

    // 1. Try cache
    const cached = await this._tryGetCache<PaginatedResponse<ShopListItem>>(cacheKey);
    if (cached) return cached;

    // 2. Query DB
    const [shops, total] = await this._shopRepository.findShopsWithAddress(query);

    // 3. Map
    const data = shops.map(ShopMapper.toShopListItem);

    const result: PaginatedResponse<ShopListItem> = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 4. Cache
    await this._trySetCache(cacheKey, result, ttl);

    return result;
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  async createReview(shopId: number, userId: string, dto: CreateShopReviewDto): Promise<void> {
    // Validate shop exists
    const shop = await this._shopRepository.findShopById(shopId);
    if (!shop) throw new NotFoundException(`Shop with id ${shopId} not found`);

    // Prevent shop owner from reviewing their own shop
    if (shop.userId === userId) {
      throw new BadRequestException("You cannot review your own shop");
    }

    // Prevent duplicate review
    const existing = await this._shopRepository.findReviewByUserAndShop(userId, shopId);
    if (existing) throw new ConflictException("You have already reviewed this shop");

    await this._shopRepository.saveReview({ shopId, userId, ...dto });

    // Invalidate shop detail cache
    await this._invalidateShopCache(shopId);
  }

  async deleteReview(shopId: number, userId: string): Promise<void> {
    const review = await this._shopRepository.findReviewByUserAndShop(userId, shopId);
    if (!review) throw new NotFoundException("Review not found");

    await this._shopRepository.deleteReview(review.id);
    await this._invalidateShopCache(shopId);
  }

  // ─── Cache Helpers ────────────────────────────────────────────────────────

  private async _tryGetCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this._redisService.getCache(key);
      if (cached) {
        this._logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this._logger.warn(`Cache GET failed for key "${key}": ${err.message}`);
    }
    return null;
  }

  private async _trySetCache(key: string, value: unknown, ttl: number): Promise<void> {
    try {
      await this._redisService.setCacheWithTTL(key, JSON.stringify(value), ttl);
    } catch (err) {
      this._logger.warn(`Cache SET failed for key "${key}": ${err.message}`);
    }
  }

  private async _invalidateShopCache(shopId: number): Promise<void> {
    await Promise.allSettled([
      this._redisService.delCache(SHOP_CACHE_KEYS.shopDetail(shopId)),
      this._redisService.deleteByPattern(SHOP_CACHE_KEYS.shopListPattern()),
      this._redisService.deleteByPattern(SHOP_CACHE_KEYS.shopSearchPattern()),
    ]);
  }
}
