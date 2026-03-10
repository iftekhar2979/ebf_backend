import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/user/entities/user.entity";
import { Repository } from "typeorm";
import { Product } from "../entities/product.entity";
import { StatsService } from "../stats/stats.service";
import { ProductLike } from "./entities/product-like.entity";

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(ProductLike)
    private readonly productLikeRepository: Repository<ProductLike>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly statsService: StatsService
  ) {}

  async toggleLike(productId: number, user: User): Promise<{ isLiked: boolean; totalLikes: number }> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const existingLike = await this.productLikeRepository.findOne({
      where: { productId, userId: user.id },
    });

    let isLiked = false;
    if (existingLike) {
      await this.productLikeRepository.remove(existingLike);
      await this.statsService.incrementStats({ productId, likes: -1 });
      isLiked = false;
    } else {
      const newLike = this.productLikeRepository.create({
        productId,
        userId: user.id,
      });
      await this.productLikeRepository.save(newLike);
      await this.statsService.incrementStats({ productId, likes: 1 });
      isLiked = true;
    }

    const updatedStats = await this.statsService.getStats(productId);
    return { isLiked, totalLikes: updatedStats.totalLikes };
  }

  async isLiked(productId: number, userId: string): Promise<boolean> {
    const like = await this.productLikeRepository.findOne({
      where: { productId, userId },
    });
    return !!like;
  }

  async getLikedProductIds(userId: string): Promise<number[]> {
    const likes = await this.productLikeRepository.find({
      where: { userId },
      select: ["productId"],
    });
    return likes.map((l) => l.productId);
  }
}
