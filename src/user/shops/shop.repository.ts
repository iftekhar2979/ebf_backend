import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "src/products/entities/product.entity";
import { Repository } from "typeorm";
import { SearchShopsQueryDto } from "./dto/shop.dto";
import { ShopProfile } from "./entities/shop.entity";
import { ShopReview } from "./reviews/enitites/reviews.entity";

@Injectable()
export class ShopRepository {
  constructor(
    @InjectRepository(ShopProfile)
    private readonly shopProfileRepo: Repository<ShopProfile>,

    @InjectRepository(ShopReview)
    private readonly shopReviewRepo: Repository<ShopReview>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>
  ) {}

  // ─── Shop ──────────────────────────────────────────────────────────────────

  async findShopById(shopId: number): Promise<ShopProfile | null> {
    return this.shopProfileRepo.findOne({
      where: { id: shopId },
      relations: ["shopAddress"],
    });
  }

  async findShopsWithAddress(query: SearchShopsQueryDto): Promise<[ShopProfile[], number]> {
    const { page, limit, name, city, area } = query;
    const skip = (page - 1) * limit;

    const qb = this.shopProfileRepo
      .createQueryBuilder("shop")
      .leftJoinAndSelect("shop.shopAddress", "shopAddress")
      .select(["shop.id", "shop.name", "shop.logo", "shopAddress.city", "shopAddress.area"])
      .skip(skip)
      .take(limit);

    if (name) {
      qb.andWhere("LOWER(shop.name) LIKE LOWER(:name)", {
        name: `%${name}%`,
      });
    }

    if (city) {
      qb.andWhere("LOWER(shopAddress.city) LIKE LOWER(:city)", {
        city: `%${city}%`,
      });
    }

    if (area) {
      qb.andWhere("LOWER(shopAddress.area) LIKE LOWER(:area)", {
        area: `%${area}%`,
      });
    }

    return qb.getManyAndCount();
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async findProductsByShopUserId(userId: string, page: number, limit: number): Promise<[Product[], number]> {
    const skip = (page - 1) * limit;

    return this.productRepo
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.images", "images")
      .leftJoinAndSelect("product.user", "user")
      .leftJoinAndSelect("user.shopProfile", "shopProfile")
      .where("product.userId = :userId", { userId })
      .orderBy("product.id", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────

  async findReviewsByShopId(shopId: number): Promise<ShopReview[]> {
    return this.shopReviewRepo.find({
      where: { shopId },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async findReviewByUserAndShop(userId: string, shopId: number): Promise<ShopReview | null> {
    return this.shopReviewRepo.findOne({ where: { userId, shopId } });
  }

  async saveReview(review: Partial<ShopReview>): Promise<ShopReview> {
    return this.shopReviewRepo.save(review);
  }

  async deleteReview(id: number): Promise<void> {
    await this.shopReviewRepo.delete(id);
  }

  async getAverageRating(shopId: number): Promise<number> {
    const result = await this.shopReviewRepo
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "avg")
      .where("review.shopId = :shopId", { shopId })
      .getRawOne();

    return result?.avg ? parseFloat(Number(result.avg).toFixed(1)) : 0;
  }
}
