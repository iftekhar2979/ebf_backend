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
import { ProductVariant } from './entities/varients.entity';
import { Product } from 'src/products/entities/product.entity';
import { Size } from 'src/products/sizes/entities/sizes.entity';
import { ProductColor } from 'src/products/colors/entities/colors.entity';
import { UpdateProductVariantDto } from 'src/products/dto/update-product.dto';
import { CreateProductVariantDto } from 'src/products/dto/create-product.dto';
import { ProductCacheService } from '../caches/caches.service';
@Injectable()
export class VarientsService {
  private readonly logger = new Logger(VarientsService.name);

  constructor(
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>,
    @InjectRepository(ProductColor)
    private colorRepository: Repository<ProductColor>,
    private dataSource: DataSource,
    private productCacheService: ProductCacheService,
    @InjectQueue('product-queue') private productQueue: Queue,
  ) {}

  /**
   * Create a new variant for a product
   */
  async create(productId: number, createVariantDto: CreateProductVariantDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate product exists
      const product = await this.productRepository.findOne({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Validate size exists
      const size = await this.sizeRepository.findOne({
        where: { id: createVariantDto.sizeId },
      });

      if (!size) {
        throw new BadRequestException(`Size with ID ${createVariantDto.sizeId} not found`);
      }

      // Validate color exists
      const color = await this.colorRepository.findOne({
        where: { id: createVariantDto.colorId },
      });

      if (!color) {
        throw new BadRequestException(`Color with ID ${createVariantDto.colorId} not found`);
      }

      // Check if variant with same SKU already exists
      const existingVariant = await this.variantRepository.findOne({
        where: { sku: createVariantDto.sku },
      });

      if (existingVariant) {
        throw new BadRequestException(`Variant with SKU ${createVariantDto.sku} already exists`);
      }

      // Check if variant with same size and color already exists for this product
      const duplicateVariant = await this.variantRepository.findOne({
        where: {
          productId,
          sizeId: createVariantDto.sizeId,
          colorId: createVariantDto.colorId,
        },
      });

      if (duplicateVariant) {
        throw new BadRequestException(
          `Variant with size ${createVariantDto.sizeId} and color ${createVariantDto.colorId} already exists for this product`,
        );
      }

      // Create variant
      const variant = queryRunner.manager.create(ProductVariant, {
        ...createVariantDto,
        productId,
      });

      const savedVariant = await queryRunner.manager.save(ProductVariant, variant);

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Variant created with ID: ${savedVariant.id} for product ${productId}`);

      return this.findOne(savedVariant.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create variant: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all variants for a product
   */
  async findByProduct(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.variantRepository.find({
      where: { productId },
      relations: ['size', 'color', 'product'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Find a single variant by ID
   */
  async findOne(id: number) {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['size', 'color', 'product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  /**
   * Find variant by SKU
   */
  async findBySku(sku: string) {
    const variant = await this.variantRepository.findOne({
      where: { sku },
      relations: ['size', 'color', 'product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with SKU ${sku} not found`);
    }

    return variant;
  }

  /**
   * Update a variant
   */
  async update(id: number, updateVariantDto: UpdateProductVariantDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const variant = await this.variantRepository.findOne({
        where: { id },
        relations: ['product'],
      });

      if (!variant) {
        throw new NotFoundException(`Variant with ID ${id} not found`);
      }

      // If SKU is being updated, check for duplicates
      if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
        const existingVariant = await this.variantRepository.findOne({
          where: { sku: updateVariantDto.sku },
        });

        if (existingVariant) {
          throw new BadRequestException(`Variant with SKU ${updateVariantDto.sku} already exists`);
        }
      }

      // Validate size if being updated
      if (updateVariantDto.sizeId) {
        const size = await this.sizeRepository.findOne({
          where: { id: updateVariantDto.sizeId },
        });

        if (!size) {
          throw new BadRequestException(`Size with ID ${updateVariantDto.sizeId} not found`);
        }
      }

      // Validate color if being updated
      if (updateVariantDto.colorId) {
        const color = await this.colorRepository.findOne({
          where: { id: updateVariantDto.colorId },
        });

        if (!color) {
          throw new BadRequestException(`Color with ID ${updateVariantDto.colorId} not found`);
        }
      }

      // Update variant
      await queryRunner.manager.update(ProductVariant, id, updateVariantDto);

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        variant.productId,
        variant.product.userId,
        variant.product.subCategoryId,
      );

      this.logger.log(`Variant ${id} updated successfully`);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update variant: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a variant
   */
  async remove(id: number) {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    // Check if this is the last variant for the product
    const variantCount = await this.variantRepository.count({
      where: { productId: variant.productId },
    });

    if (variantCount === 1) {
      throw new BadRequestException('Cannot delete the last variant of a product');
    }

    await this.variantRepository.remove(variant);

    // Invalidate product cache
    await this.productCacheService.invalidateProductCaches(
      variant.productId,
      variant.product.userId,
      variant.product.subCategoryId,
    );

    this.logger.log(`Variant ${id} deleted successfully`);

    return { message: 'Variant deleted successfully' };
  }

  /**
   * Find variants by color
   */
  async findByColor(productId: number, colorId: number) {
    return this.variantRepository.find({
      where: { productId, colorId },
      relations: ['size', 'color'],
      order: { price: 'ASC' },
    });
  }

  /**
   * Find variants by size
   */
  async findBySize(productId: number, sizeId: number) {
    return this.variantRepository.find({
      where: { productId, sizeId },
      relations: ['size', 'color'],
      order: { price: 'ASC' },
    });
  }

  /**
   * Find variants within price range
   */
  async findByPriceRange(productId: number, minPrice: number, maxPrice: number) {
    return this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .where('variant.productId = :productId', { productId })
      .andWhere('variant.price >= :minPrice', { minPrice })
      .andWhere('variant.price <= :maxPrice', { maxPrice })
      .orderBy('variant.price', 'ASC')
      .getMany();
  }

  /**
   * Bulk create variants
   */
  async bulkCreate(productId: number, variants: CreateProductVariantDto[]) {
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

      // Validate all SKUs are unique
      const skus = variants.map(v => v.sku);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        throw new BadRequestException('Duplicate SKUs found in variant list');
      }

      // Check for existing SKUs
      const existingVariants = await this.variantRepository.find({
        where: { sku: In(skus) },
      });

      if (existingVariants.length > 0) {
        throw new BadRequestException(
          `SKUs already exist: ${existingVariants.map(v => v.sku).join(', ')}`,
        );
      }

      // Create all variants
      const variantEntities = variants.map(variantDto =>
        queryRunner.manager.create(ProductVariant, {
          ...variantDto,
          productId,
        }),
      );

      const savedVariants = await queryRunner.manager.save(ProductVariant, variantEntities);

      await queryRunner.commitTransaction();

      // Invalidate product cache
      await this.productCacheService.invalidateProductCaches(
        productId,
        product.userId,
        product.subCategoryId,
      );

      this.logger.log(`Bulk created ${savedVariants.length} variants for product ${productId}`);

      return savedVariants;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to bulk create variants: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get cheapest variant for a product
   */
  async getCheapestVariant(productId: number) {
    return this.variantRepository.findOne({
      where: { productId },
      relations: ['size', 'color'],
      order: { price: 'ASC' },
    });
  }

  /**
   * Get available colors for a product
   */
  async getAvailableColors(productId: number) {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.color', 'color')
      .where('variant.productId = :productId', { productId })
      .groupBy('variant.colorId')
      .addGroupBy('color.id')
      .getMany();

    return variants.map(v => v.color).filter((color, index, self) =>
      index === self.findIndex(c => c.id === color.id)
    );
  }

  /**
   * Get available sizes for a product
   */
  async getAvailableSizes(productId: number) {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.size', 'size')
      .where('variant.productId = :productId', { productId })
      .groupBy('variant.sizeId')
      .addGroupBy('size.id')
      .getMany();

    return variants.map(v => v.size).filter((size, index, self) =>
      index === self.findIndex(s => s.id === size.id)
    );
  }
}