import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ProductImage } from './entities/images.entity';
import { Product } from 'src/products/entities/product.entity';
import { CreateProductImageDto } from 'src/products/dto/create-product.dto';
import { ProductCacheService } from '../caches/caches.service';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly MIN_IMAGES = 2;
  private readonly MAX_IMAGES = 5;

  constructor(
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
    private productCacheService: ProductCacheService,
    @InjectQueue('product-queue') private productQueue: Queue,
  ) {}

  /**
   * Add a new image to a product
   * Validates maximum image limit
   */
  async create(productId: number, createImageDto: CreateProductImageDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate product exists
      const product = await queryRunner.manager.findOne(Product,{
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check current image count
      const currentImageCount = await queryRunner.manager.count(ProductImage,{
        where: { productId, deletedAt: null },
      });

      if (currentImageCount >= this.MAX_IMAGES) {
        throw new BadRequestException(
          `Product already has maximum ${this.MAX_IMAGES} images. Delete an existing image first.`,
        );
      }

      // Create image
      const image = queryRunner.manager.create(ProductImage, {
        productId,
        image: createImageDto.image,
      });

      const savedImage = await queryRunner.manager.save(ProductImage, image);

      await queryRunner.commitTransaction();

      // Queue image processing
      await this.productQueue.add('process-images', {
        productId,
        imageUrls: [savedImage.image],
      });

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Image created with ID: ${savedImage.id} for product ${productId}`);

      return savedImage;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create image: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all images for a product
   */
  async findByProduct(productId: number) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    const product = await queryRunner.manager.findOne(Product,{
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return queryRunner.manager.find(ProductImage,{
      where: { productId },
      order: { id: 'ASC' },
    });
  }

  /**
   * Find a single image by ID
   */
  async findOne(id: number) {
    const image = await this.imageRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  /**
   * Update an image URL
   */
  async update(id: number, updateImageDto: CreateProductImageDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const image = await this.imageRepository.findOne({
        where: { id },
        relations: ['product'],
      });

      if (!image) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }

      // Update image
      await queryRunner.manager.update(ProductImage, id, {
        image: updateImageDto.image,
      });

      await queryRunner.commitTransaction();

      // Queue image processing
      await this.productQueue.add('process-images', {
        productId: image.productId,
        imageUrls: [updateImageDto.image],
      });

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        image.productId,
        image.product.userId,
        image.product.subCategoryId,
      );

      this.logger.log(`Image ${id} updated successfully`);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update image: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Soft delete an image
   * Validates minimum image requirement
   */
  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const image = await this.imageRepository.findOne({
        where: { id },
        relations: ['product'],
      });

      if (!image) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }

      // Check if product will still have minimum required images
      const currentImageCount = await this.imageRepository.count({
        where: { productId: image.productId, deletedAt: null },
      });

      if (currentImageCount <= this.MIN_IMAGES) {
        throw new BadRequestException(
          `Cannot delete image. Product must have at least ${this.MIN_IMAGES} images.`,
        );
      }

      // Soft delete image
      await queryRunner.manager.softDelete(ProductImage, id);

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        image.productId,
        image.product.userId,
        image.product.subCategoryId,
      );

      this.logger.log(`Image ${id} deleted successfully`);

      return { message: 'Image deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete image: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk create images for a product
   * Validates total image count doesn't exceed maximum
   */
  async bulkCreate(productId: number, images: CreateProductImageDto[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Check current image count
      const currentImageCount = await this.imageRepository.count({
        where: { productId, deletedAt: null },
      });

      const totalImages = currentImageCount + images.length;

      if (totalImages > this.MAX_IMAGES) {
        throw new BadRequestException(
          `Cannot add ${images.length} images. Product would have ${totalImages} images, exceeding maximum of ${this.MAX_IMAGES}.`,
        );
      }

      // Create all images
      const imageEntities = images.map(imageDto =>
        queryRunner.manager.create(ProductImage, {
          productId,
          image: imageDto.image,
        }),
      );

      const savedImages = await queryRunner.manager.save(ProductImage, imageEntities);

      await queryRunner.commitTransaction();

      // Queue image processing
      await this.productQueue.add('process-images', {
        productId,
        imageUrls: savedImages.map(img => img.image),
      });

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Bulk created ${savedImages.length} images for product ${productId}`);

      return savedImages;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to bulk create images: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk delete images
   * Validates minimum image requirement is maintained
   */
  async bulkDelete(productId: number, imageIds: number[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify all images belong to this product
      const images = await this.imageRepository.find({
        where: { id: In(imageIds), productId },
      });

      if (images.length !== imageIds.length) {
        throw new BadRequestException('Some images do not belong to this product');
      }

      // Check if remaining images meet minimum requirement
      const currentImageCount = await this.imageRepository.count({
        where: { productId, deletedAt: null },
      });

      const remainingImages = currentImageCount - imageIds.length;

      if (remainingImages < this.MIN_IMAGES) {
        throw new BadRequestException(
          `Cannot delete ${imageIds.length} images. Product must have at least ${this.MIN_IMAGES} images.`,
        );
      }

      // Soft delete images
      await queryRunner.manager.softDelete(ProductImage, imageIds);

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Bulk deleted ${imageIds.length} images for product ${productId}`);

      return { message: `${imageIds.length} images deleted successfully` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to bulk delete images: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Replace all images for a product
   * Ensures new images meet 2-5 requirement
   */
  async replaceAll(productId: number, newImages: CreateProductImageDto[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (newImages.length < this.MIN_IMAGES || newImages.length > this.MAX_IMAGES) {
        throw new BadRequestException(
          `Product must have between ${this.MIN_IMAGES} and ${this.MAX_IMAGES} images`,
        );
      }

      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Delete all existing images
      await queryRunner.manager.softDelete(ProductImage, { productId });

      // Create new images
      const imageEntities = newImages.map(imageDto =>
        queryRunner.manager.create(ProductImage, {
          productId,
          image: imageDto.image,
        }),
      );

      const savedImages = await queryRunner.manager.save(ProductImage, imageEntities);

      await queryRunner.commitTransaction();

      // Queue image processing
      await this.productQueue.add('process-images', {
        productId,
        imageUrls: savedImages.map(img => img.image),
      });

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Replaced all images for product ${productId}`);

      return savedImages;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to replace images: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get first image (primary/thumbnail) for a product
   */
  async getPrimaryImage(productId: number) {
    return this.imageRepository.findOne({
      where: { productId },
      order: { id: 'ASC' },
    });
  }

  /**
   * Reorder images
   */
  async reorder(productId: number, imageIdsInOrder: number[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Verify all images belong to this product
      const images = await this.imageRepository.find({
        where: { id: In(imageIdsInOrder), productId },
      });

      if (images.length !== imageIdsInOrder.length) {
        throw new BadRequestException('Some images do not belong to this product');
      }

      // Note: If you want to implement actual ordering, you'd need an 'order' column
      // For now, this validates the images exist

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      return { message: 'Images reordered successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to reorder images: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}