import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/redis/redis.service";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { ShopProfile } from "../entities/shop.entity";
import { FavouriteShop } from "./entities/favourite.entity";

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(FavouriteShop)
    private readonly favouritRepository: Repository<FavouriteShop>,
    @InjectRepository(ShopProfile)
    private readonly shopRepository: Repository<ShopProfile>,
    private readonly redisService: RedisService
  ) {}

  private getCacheKey(userId: string): string {
    return `user_favourite_shops:${userId}`;
  }

  async toggleFavourite(shopId: number, user: User) {
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    const favourite = await this.favouritRepository.findOne({
      where: { shopId, userId: user.id },
    });

    if (favourite) {
      await this.favouritRepository.remove(favourite);
      await this.clearCache(user.id);
      return { message: "Removed from favourites", isFavourite: false };
    } else {
      const newFavourite = this.favouritRepository.create({
        shopId,
        userId: user.id,
      });
      await this.favouritRepository.save(newFavourite);
      await this.clearCache(user.id);
      return { message: "Added to favourites", isFavourite: true };
    }
  }

  async getFavourites(user: User, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const cacheKey = `${this.getCacheKey(user.id)}:p${page}:l${limit}`;

    const cachedData = await this.redisService.get<string>(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const [items, total] = await this.favouritRepository.findAndCount({
      where: { userId: user.id },
      relations: ["shop"],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const result = {
      items: items.map((fav) => fav.shop),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redisService.setEx(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour

    return result;
  }

  private async clearCache(userId: string) {
    await this.redisService.deleteByPatternSafe(`${this.getCacheKey(userId)}*`);
  }

  async isFavourite(userId: string, shopId: number): Promise<{ isFavourite: boolean; shopId: number }> {
    const cacheKey = `${this.getCacheKey(userId)}:isFav:${shopId}`;
    const cached = await this.redisService.get<string>(cacheKey);

    if (cached !== null) {
      return { isFavourite: cached === "true", shopId };
    }

    const favourite = await this.favouritRepository.findOne({
      where: { userId, shopId },
    });

    const result = !!favourite;
    await this.redisService.setEx(cacheKey, String(result), 3600); // Cache for 1 hour
    return { isFavourite: result, shopId };
  }

  async getFavouriteShopIds(userId: string): Promise<number[]> {
    const cacheKey = `${this.getCacheKey(userId)}:ids`;
    const cached = await this.redisService.get<string>(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const favourites = await this.favouritRepository.find({
      where: { userId },
      select: ["shopId"],
    });

    const ids = favourites.map((fav) => fav.shopId);
    await this.redisService.setEx(cacheKey, JSON.stringify(ids), 3600);
    return ids;
  }
}
