import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductStat } from 'src/products/stats/entities/product_stats.entity';
import { ProductCacheService } from 'src/products/caches/caches.service';
import { InjectLogger } from 'src/shared/decorators/logger.decorator';
import { StatsService } from 'src/products/stats/stats.service';
export interface ProductCreatedJob {
  productId: number;
  userId: string;
  subCategoryId: number;
}

export interface ProductStatsUpdateJob {
  productId: number;
  incrementViews?: boolean;
  incrementWishlists?: boolean;
  incrementCarts?: boolean;
}

export interface CacheWarmingJob {
  productIds: number[];
}

export interface ImageProcessingJob {
  productId: number;
  imageUrls: string[];
}

@Processor('product-queue')
@Injectable()
export class ProductQueueProcessor {
  constructor(
    // @InjectRepository(ProductStat)
    // private productStatRepository: Repository<ProductStat>,
    private productCacheService: ProductCacheService,
    private productStatsService: StatsService,
    @InjectLogger() private readonly logger:Logger
  ) {}

  @Process('product-created')
  async handleProductCreated(job: Job<ProductCreatedJob>) {
    this.logger.log(`Processing product-created job for product ${job.data.productId}`);
    
    try {
      // Initialize product stats
   await this.productStatsService.create(job.data)
      
      // Invalidate user and subcategory caches
      await this.productCacheService.invalidateUserProducts(job.data.userId);
      await this.productCacheService.invalidateSubCategoryProducts(job.data.subCategoryId);
      
      this.logger.log(`Product ${job.data.productId} stats initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to process product-created job: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-product-stats')
  async handleStatsUpdate(job: Job<ProductStatsUpdateJob>) {
    this.logger.log(`Updating stats for product ${job.data.productId}`);
    
    try {
      const updateData: any = {};
      
      if (job.data.incrementViews) {
        updateData.viewCount = () => 'view_count + 1';
      }
      if (job.data.incrementWishlists) {
        updateData.wishlistCount = () => 'wishlist_count + 1';
      }
      if (job.data.incrementCarts) {
        updateData.cartCount = () => 'cart_count + 1';
      }
      
      if (Object.keys(updateData).length > 0) {
        // await this.productStatRepository.update(
        //   { productId: job.data.productId },
        //   updateData,
        // );
      }
      
      this.logger.log(`Stats updated for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to update product stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('cache-warming')
  async handleCacheWarming(job: Job<CacheWarmingJob>) {
    this.logger.log(`Warming cache for ${job.data.productIds.length} products`);
    
    try {
      // This would fetch products from DB and warm the cache
      // Implementation depends on your specific needs
      this.logger.log(`Cache warming completed for ${job.data.productIds.length} products`);
    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('process-images')
  async handleImageProcessing(job: Job<ImageProcessingJob>) {
    this.logger.log(`Processing images for product ${job.data.productId}`);
    
    try {
      // Here you can add image optimization, thumbnail generation, etc.
      // For example:
      // - Resize images
      // - Generate thumbnails
      // - Compress images
      // - Upload to CDN
      
      this.logger.log(`Images processed for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to process images: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('invalidate-cache')
  async handleCacheInvalidation(job: Job<{ productId: number; userId: string; subCategoryId: number }>) {
    this.logger.log(`Invalidating cache for product ${job.data.productId}`);
    
    try {
      // await this.productCacheService.invalidateProductCaches(
      //   job.data.productId,
      //   job.data.userId,
      //   job.data.subCategoryId,
      // );
      
      this.logger.log(`Cache invalidated for product ${job.data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache: ${error.message}`, error.stack);
      throw error;
    }
  }
}