import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { User } from "src/user/entities/user.entity";
import { CreateProductReviewDto } from "./dto/create-review.dto";
import { ProductReviewMapper } from "./mapper/product-review.mapper";
import { ProductReviewRepository } from "./repositories/product-review.repository";

@Injectable()
export class ProductReviewsService {
  constructor(
    private readonly reviewRepository: ProductReviewRepository,
    private readonly redisService: RedisService
  ) {}

  private getCacheKey(productId: number): string {
    return `product_reviews:${productId}`;
  }

  async create(productId: number, user: User, createDto: CreateProductReviewDto) {
    const product = await this.reviewRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingReview = await this.reviewRepository.findReviewByUserAndProduct(
      user.id,
      productId
    );

    if (existingReview) {
      throw new ConflictException("You have already reviewed this product");
    }

    const review = await this.reviewRepository.saveReview({
      productId,
      userId: user.id,
      rating: createDto.rating,
      comment: createDto.comment,
    });

    if (createDto.images && createDto.images.length > 0) {
      await this.reviewRepository.saveImages(review.id, createDto.images);
    }

    await this.clearCache(productId);

    return ProductReviewMapper.toResponse(
      await this.reviewRepository.findReviewByUserAndProduct(user.id, productId)
    );
  }

  async findAll(productId: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const cacheKey = `${this.getCacheKey(productId)}:p${page}:l${limit}`;

    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const [reviews, total] = await this.reviewRepository.findReviewsByProductId(
      productId,
      page,
      limit
    );

    const averageRating = await this.reviewRepository.getAverageRating(productId);

    const result = {
      items: ProductReviewMapper.toManyResponse(reviews),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating,
      },
    };

    await this.redisService.setEx(cacheKey, JSON.stringify(result), 3600); // 1 hour TTL

    return result;
  }

  private async clearCache(productId: number) {
    await this.redisService.deleteByPatternSafe(`${this.getCacheKey(productId)}*`);
  }
}
