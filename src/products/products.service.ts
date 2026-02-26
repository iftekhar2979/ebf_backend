import { InjectQueue } from "@nestjs/bull";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { User } from "src/user/entities/user.entity";
import { DataSource, Repository } from "typeorm";
import { ProductCacheService } from "./caches/caches.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Product } from "./entities/product.entity";
import { ProductImage } from "./images/entities/images.entity";
import { RankingsService } from "./rankings/rankings.service";
import { SubCategory } from "./sub_categories/entities/sub_categories.entity";
import { ProductFilters } from "./types/productFilters";
import { ProductVariant } from "./varients/entities/varients.entity";

@Injectable()
export class ProductsService {
  constructor(
    private readonly _dataSource: DataSource,
    private readonly productCacheService: ProductCacheService,
    @InjectLogger() private readonly logger: Logger,
    @InjectQueue("product-queue") private readonly productQueue: Queue,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    private readonly rankingService: RankingsService
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    if (!createProductDto.subCategoryId) {
      throw new BadRequestException("subCategoryId is required");
    }

    if (!createProductDto.productName || createProductDto.productName.trim() === "") {
      throw new BadRequestException("Product name is required");
    }

    if (!createProductDto.variants || !createProductDto.variants.length) {
      throw new BadRequestException("At least one variant is required");
    }

    if (
      !createProductDto.images ||
      createProductDto.images.length < 2 ||
      createProductDto.images.length > 5
    ) {
      throw new BadRequestException("Product must have between 2 and 5 images");
    }

    if (createProductDto.discountPercentage) {
      if (!createProductDto.discountStartDate || !createProductDto.discountEndDate) {
        throw new BadRequestException("Discount start and end dates are required when discount is set");
      }
      const startDate = new Date(createProductDto.discountStartDate);
      const endDate = new Date(createProductDto.discountEndDate);
      if (startDate >= endDate) {
        throw new BadRequestException("Discount end date must be after start date");
      }
    }

    // Step 2: Wrap DB operations in a transaction
    const savedProduct = await this._dataSource.transaction(async (manager) => {
      // Validate subCategory exists
      const subCategory = await manager.findOne(SubCategory, {
        where: { id: createProductDto.subCategoryId },
      });
      if (!subCategory) {
        throw new BadRequestException("SubCategory not found");
      }

      // Create product
      const product = manager.create(Product, {
        productName: createProductDto.productName,
        userId: user.id,
        targetedGender: createProductDto.targetedGender,
        subCategoryId: createProductDto.subCategoryId,
        description: createProductDto.description,
        discountPercentage: createProductDto.discountPercentage ?? null,
        discountStartDate: createProductDto.discountStartDate
          ? new Date(createProductDto.discountStartDate)
          : null,
        discountEndDate: createProductDto.discountEndDate ? new Date(createProductDto.discountEndDate) : null,
      });

      const savedProduct = await manager.save(product);

      // Bulk insert variants
      const variants = createProductDto.variants.map((variantDto) => ({
        ...variantDto,
        productId: savedProduct.id,
      }));

      await manager.createQueryBuilder().insert().into(ProductVariant).values(variants).execute();

      // Bulk insert images
      const images = createProductDto.images.map((imageDto) => ({
        productId: savedProduct.id,
        image: imageDto.image,
      }));

      await manager.createQueryBuilder().insert().into(ProductImage).values(images).execute();

      return savedProduct;
    });

    // Step 3: Fire-and-forget async operations
    this.productQueue.add("product-created", {
      productId: savedProduct.id,
      userId: savedProduct.userId,
      subCategoryId: savedProduct.subCategoryId,
    });

    this.productQueue.add("process-images", {
      productId: savedProduct.id,
      imageUrls: createProductDto.images.map((img) => img.image),
    });

    // Step 4: Return product (without extra find query)
    return {
      id: savedProduct.id,
      productName: savedProduct.productName,
      userId: savedProduct.userId,
      subCategoryId: savedProduct.subCategoryId,
      targetedGender: savedProduct.targetedGender,
      description: savedProduct.description,
      discountPercentage: savedProduct.discountPercentage,
      discountStartDate: savedProduct.discountStartDate,
      discountEndDate: savedProduct.discountEndDate,
      variants: createProductDto.variants,
      images: createProductDto.images,
    };
  }

  async incrementView(productId: number) {
    await this.productQueue.add("update-product-stats", {
      productId,
      incrementViews: true,
    });
  }

  /**
   * Get trending products (most viewed)
   */
  async getTrendingProducts(limit: number = 10) {
    return await this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.stats", "stats")
      .leftJoinAndSelect("product.images", "images")
      .leftJoinAndSelect("product.variants", "variants")
      .orderBy("stats.totalViews", "DESC")
      .take(limit)
      .getMany();
  }

  /**
   * Soft delete a product
   */
  async remove(id: number) {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.softDelete(id);

    // Invalidate cache
    await this.productQueue.add("invalidate-cache", {
      productId: id,
      userId: product.userId,
      subCategoryId: product.subCategoryId,
    });

    return { message: "Product deleted successfully" };
  }

  async findAll(filters: ProductFilters = {}) {
    // 1. Build stable cache key
    const cacheKey = `products:${JSON.stringify(filters)}`;

    const cachedResult = await this.productCacheService.getProductList(cacheKey);
    if (cachedResult) {
      this.logger.log("Returning products from cache");
      return cachedResult;
    }

    // 2. Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // max 100 per page
    const skip = (page - 1) * limit;

    // 3. QueryBuilder
    const queryBuilder = this.productRepository
      .createQueryBuilder("product")
      .leftJoin(
        "product.images",
        "image",
        `image.id = (
      SELECT pi.id FROM product_images pi 
      WHERE pi."productId" = product.id 
      AND pi."deletedAt" IS NULL
      ORDER BY pi.id ASC 
      LIMIT 1
    )`
      )
      .leftJoin(
        "product.variants",
        "variant",
        `variant.id = (
      SELECT pv.id FROM product_varients pv
      WHERE pv."productId" = product.id
      ORDER BY pv.price ASC
      LIMIT 1
    )`
      )
      .leftJoin("product.user", "user")
      .leftJoin("user.shopProfile", "shopProfile")
      .select([
        "product",
        "image.id",
        "image.image",
        // "variant.id",
        "variant.price",
        // "variant.discount",
        "shopProfile.name",
      ]);
    // 4. Apply filters
    if (filters.userId) queryBuilder.andWhere("product.userId = :userId", { userId: filters.userId });
    if (filters.subCategoryId)
      queryBuilder.andWhere("product.subCategoryId = :subCategoryId", {
        subCategoryId: filters.subCategoryId,
      });
    if (filters.targetedGender)
      queryBuilder.andWhere("product.targetedGender = :targetedGender", {
        targetedGender: filters.targetedGender,
      });

    // Price filter using join (more efficient than subquery)
    if (filters.minPrice !== undefined)
      queryBuilder.andWhere("variant.price >= :minPrice", { minPrice: filters.minPrice });
    if (filters.maxPrice !== undefined)
      queryBuilder.andWhere("variant.price <= :maxPrice", { maxPrice: filters.maxPrice });

    // Discount filter
    if (filters.hasDiscount) {
      queryBuilder.andWhere("product.discountPercentage IS NOT NULL");
      queryBuilder.andWhere("product.discountStartDate <= NOW()");
      queryBuilder.andWhere("product.discountEndDate >= NOW()");
    }

    // Search
    if (filters.search) {
      queryBuilder.andWhere("(product.productName ILIKE :search OR product.description ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }

    // 5. Get data + count in a single query
    const [products, total] = await queryBuilder
      .orderBy("product.id", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    const flattenedProducts = products.map((product) => ({
      id: product.id,
      productName: product.productName,
      // Since your join logic already limits this to 1 item, we just grab the first index
      price: product.variants[0]?.price || null,
      image: product.images[0]?.image || null,
      shopName: product.user?.shopProfile?.name || null,
      discountPercentage: product.discountPercentage,
      reviews: 4,
    }));
    const result = {
      data: flattenedProducts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 6. Cache the result with TTL
    await this.productCacheService.setProductList(cacheKey, result); // cache for 60 seconds

    return result;
  }

  async findOne(id: number) {
    // 1️⃣ Try cache first
    const cached = await this.productCacheService.getProduct(id);
    if (cached) {
      this.logger.log(`Returning product ${id} from cache`);
      return cached;
    }

    // 2️⃣ Acquire distributed lock (anti-cache-stampede)
    const lockKey = `lock:product:${id}`;
    const lockAcquired = await this.productCacheService.acquireLock(lockKey, 5);

    if (!lockAcquired) {
      // Another request is already fetching from DB
      // Wait briefly and retry cache
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.productCacheService.getProduct(id);
    }

    try {
      // 3️⃣ Fetch from DB (use QueryBuilder for better performance control)
      const product = await this.productRepository
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.variants", "variant")
        .leftJoinAndSelect("variant.size", "size")
        .leftJoinAndSelect("variant.color", "color")
        .leftJoinAndSelect("product.images", "image")
        .leftJoinAndSelect("product.subCategory", "subCategory")
        .leftJoinAndSelect("product.stats", "stats")
        .leftJoinAndSelect("product.rank", "rank")
        .where("product.id = :id", { id })
        .getOne();

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // 4️⃣ Cache with TTL (e.g., 5 minutes)
      await this.productCacheService.setProduct(id, product);

      return product;
    } finally {
      await this.productCacheService.releaseLock(lockKey, lockAcquired);
    }
  }
  async update(id: number, updateProductDto: UpdateProductDto) {
    // 1. PRE-VALIDATE INPUT (outside transaction)
    if (updateProductDto.discountStartDate && updateProductDto.discountEndDate) {
      if (new Date(updateProductDto.discountStartDate) >= new Date(updateProductDto.discountEndDate)) {
        throw new BadRequestException("Discount end date must be after start date");
      }
    }

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // 2. LOCK ROW FOR UPDATE (critical for concurrency)
      await queryRunner.startTransaction();
      const product = await queryRunner.manager.findOne(Product, {
        where: { id },
        lock: { mode: "pessimistic_write" }, // Prevents concurrent modifications
      });

      if (!product) throw new NotFoundException(`Product ${id} not found`);

      // 3. BUILD SAFE UPDATE PAYLOAD (preserve existing values)
      const updatePayload: Partial<Product> = {};
      for (const [key, value] of Object.entries(updateProductDto)) {
        if (value !== undefined) {
          if (["discountStartDate", "discountEndDate"].includes(key) && typeof value === "string") {
            updatePayload[key] = new Date(value);
          } else {
            updatePayload[key] = value;
          }
        }
      }

      // 4. ATOMIC UPDATE + REFETCH IN TRANSACTION
      await queryRunner.manager.update(Product, id, updatePayload);
      const updatedProduct = await queryRunner.manager.findOne(Product, { where: { id } });
      await queryRunner.commitTransaction();

      // 5. SYNCHRONOUS CACHE PURGE (critical for response consistency)
      // await Promise.all([
      //   this.cacheManager.del(`product:${id}`),
      //   this.cacheManager.del(`user:${updatedProduct.userId}:products`),
      //   this.cacheManager.del(`subcategory:${updatedProduct.subCategoryId}:products`)
      // ]).catch(err => this.logger.warn('Cache purge partial failure', err));

      // // 6. ASYNC QUEUE FOR SECONDARY INVALIDATION (with retry)
      // this.productQueue.add('deep-invalidate-cache', {
      //   productId: id,
      //   oldKeys: [/* capture pre-update userId/subCat if mutable */],
      //   newKeys: [
      //     `product:${id}`,
      //     `user:${updatedProduct.userId}:products`,
      //     `subcategory:${updatedProduct.subCategoryId}:products`
      //   ]
      // }, {
      //   attempts: 3,
      //   backoff: { type: 'exponential', delay: 1000 }
      // }).catch(err => this.logger.error('Queue enqueue failed', err));

      return updatedProduct; // Fresh DB data - no stale cache risk
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // this.handleDbError(error); // Centralized error normalization
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private handleDbError(error: any): never {
    this.logger.error("Database operation failed", {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      query: error.query,
    });

    // TypeORM/PostgreSQL specific error codes
    const errorCode = error?.code || error?.errno;

    switch (errorCode) {
      // Foreign key violations (e.g., invalid userId/subCategoryId)
      case "23503":
      case "ER_NO_REFERENCED_ROW_2":
        throw new BadRequestException(
          `Invalid reference: ${error.detail?.match(/"([^"]+)"/)?.[1] || "related entity"}`
        );

      // Unique constraint violations (e.g., duplicate SKU)
      case "23505":
      case "ER_DUP_ENTRY":
        const field = error.detail?.match(/Key \(([^)]+)\)/)?.[1] || "field";
        throw new ConflictException(`Duplicate value for ${field}. This value must be unique.`);

      // Row not found during lock (race condition: deleted mid-transaction)
      case "23502": // NOT NULL violation (if locking fails)
      case "PessimisticLockNotFound":
        throw new NotFoundException("Product was modified or deleted during update");

      // Deadlock detected (retryable)
      case "40P01":
      case "ER_LOCK_DEADLOCK":
        //   this.metrics.increment('db.deadlocks');
        throw new ServiceUnavailableException("Temporary database conflict. Please retry the request.");

      // Connection issues
      case "ECONNREFUSED":
      case "ETIMEDOUT":
        //   this.metrics.increment('db.connection_failures');
        throw new ServiceUnavailableException("Database temporarily unavailable");

      default:
        // Log full error for internal debugging (never expose to client)
        if (process.env.NODE_ENV === "development") {
          this.logger.debug("Full error stack:", error.stack);
        }
        throw new InternalServerErrorException("Failed to process product update");
    }
  }
}
