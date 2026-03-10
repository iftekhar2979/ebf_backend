import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "src/products/entities/product.entity";
import { Repository } from "typeorm";
import { ProductReviewImage } from "../entities/product-review-image.entity";
import { ProductReview } from "../entities/product-review.entity";

@Injectable()
export class ProductReviewRepository {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(ProductReviewImage)
    private readonly imageRepo: Repository<ProductReviewImage>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>
  ) {}

  async findProductById(id: number) {
    return this.productRepo.findOne({ where: { id } });
  }

  async findReviewsByProductId(productId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.reviewRepo.findAndCount({
      where: { productId },
      relations: ["user", "images"],
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });
  }

  async findReviewByUserAndProduct(userId: string, productId: number) {
    return this.reviewRepo.findOne({
      where: { userId, productId },
      relations: ["images"],
    });
  }

  async saveReview(reviewData: Partial<ProductReview>) {
    const review = this.reviewRepo.create(reviewData);
    return this.reviewRepo.save(review);
  }

  async deleteReview(id: number) {
    return this.reviewRepo.delete(id);
  }

  async getAverageRating(productId: number): Promise<number> {
    const result = await this.reviewRepo
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "avg")
      .where("review.productId = :productId", { productId })
      .getRawOne();

    return result?.avg ? parseFloat(Number(result.avg).toFixed(1)) : 0;
  }

  async saveImages(reviewId: number, images: string[]) {
    const imageEntities = images.map((image) =>
      this.imageRepo.create({ reviewId, image })
    );
    return this.imageRepo.save(imageEntities);
  }
}
