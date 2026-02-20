import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { SubCategory } from "./entities/sub_categories.entity";
import { Category } from "../categories/entities/categories.entity";
import { Product } from "../entities/product.entity";
import { CreateSubCategoryDto } from "./dto/create-sub-category.dto";
import { QuerySubCategoryDto } from "./dto/query-sub-category.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import { UpdateSubCategoryDto } from "./dto/update-sub-category.dto";

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) {}

  /**
   * Create a new subcategory
   */
  async create(createSubCategoryDto: CreateSubCategoryDto): Promise<SubCategory> {
    const { categoryId, name, description } = createSubCategoryDto;

    // Verify that the parent category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Check if subcategory with same name already exists in this category
    // The database has a unique index on [categoryId, name]
    const existingSubCategory = await this.subCategoryRepository.findOne({
      where: { categoryId, name },
    });

    if (existingSubCategory) {
      throw new ConflictException(
        `Subcategory with name "${name}" already exists in category "${category.name}"`
      );
    }

    try {
      const subCategory = this.subCategoryRepository.create({
        categoryId,
        name,
        description,
      });

      return await this.subCategoryRepository.save(subCategory);
    } catch (error) {
      throw new BadRequestException("Failed to create subcategory");
    }
  }

  /**
   * Get all subcategories with pagination and filtering
   */
  async findAll(query: QuerySubCategoryDto) {
    const { page = 1, limit = 10, name, description, categoryId } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    // Filter by categoryId
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }

    // Filter by name (partial match)
    if (name) {
      whereConditions.name = Like(`%${name}%`);
    }

    // Filter by description (partial match)
    if (description) {
      whereConditions.description = Like(`%${description}%`);
    }

    const [data, total] = await this.subCategoryRepository.findAndCount({
      where: whereConditions,
      relations: ["category"],
      take: limit,
      skip: skip,
      order: { createdAt: "DESC" },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single subcategory by ID
   */
  async findOne(id: number): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id },
      relations: ["category"],
    });

    if (!subCategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return subCategory;
  }

  /**
   * Get a single subcategory by ID with products count
   */
  async findOneWithCount(id: number) {
    const subCategory = await this.findOne(id);

    const productCount = await this.productRepository.count({
      where: { subCategory: { id } },
    });

    return {
      ...subCategory,
      productsCount: productCount,
    };
  }

  /**
   * Get all products by subcategory ID with pagination
   */
  async findProductsBySubCategoryId(subCategoryId: number, query: QueryProductDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // First check if the subcategory exists
    const subCategory = await this.findOne(subCategoryId);

    const [data, total] = await this.productRepository.findAndCount({
      where: { subCategory: { id: subCategoryId } },
      relations: ["subCategory", "subCategory.category"],
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        subCategory: {
          id: subCategory.id,
          name: subCategory.name,
          description: subCategory.description,
          category: subCategory.category,
        },
      },
    };
  }

  /**
   * Update a subcategory
   */
  async update(id: number, updateSubCategoryDto: UpdateSubCategoryDto): Promise<SubCategory> {
    const subCategory = await this.findOne(id);

    const { categoryId, name, description } = updateSubCategoryDto;

    // If categoryId is being updated, verify the new category exists
    if (categoryId && categoryId !== subCategory.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }
    }

    // Check for duplicate name within the same category
    if (name || categoryId) {
      const targetCategoryId = categoryId || subCategory.categoryId;
      const targetName = name || subCategory.name;

      // Only check if name or categoryId is actually changing
      if (targetName !== subCategory.name || targetCategoryId !== subCategory.categoryId) {
        const existingSubCategory = await this.subCategoryRepository.findOne({
          where: {
            categoryId: targetCategoryId,
            name: targetName,
          },
        });

        if (existingSubCategory && existingSubCategory.id !== id) {
          throw new ConflictException(
            `Subcategory with name "${targetName}" already exists in this category`
          );
        }
      }
    }

    // Update the subcategory
    Object.assign(subCategory, updateSubCategoryDto);

    try {
      return await this.subCategoryRepository.save(subCategory);
    } catch (error) {
      throw new BadRequestException("Failed to update subcategory");
    }
  }

  /**
   * Delete a subcategory
   */
  async remove(id: number): Promise<{ message: string }> {
    const subCategory = await this.findOne(id);

    // Check if subcategory has associated products
    const productCount = await this.productRepository.count({
      where: { subCategory: { id } },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete subcategory. It has ${productCount} associated product(s)`
      );
    }

    await this.subCategoryRepository.remove(subCategory);

    return {
      message: `Subcategory with ID ${id} has been successfully deleted`,
    };
  }

  /**
   * Get subcategories with products count
   */
  async findAllWithProductCount(query: QuerySubCategoryDto) {
    const result = await this.findAll(query);

    const dataWithCounts = await Promise.all(
      result.data.map(async (subCategory) => {
        const productCount = await this.productRepository.count({
          where: { subCategory: { id: subCategory.id } },
        });
        return {
          ...subCategory,
          productsCount: productCount,
        };
      })
    );

    return {
      data: dataWithCounts,
      meta: result.meta,
    };
  }

  /**
   * Get all subcategories by category ID (without pagination - for dropdowns)
   */
  async findByCategoryId(categoryId: number): Promise<SubCategory[]> {
    // Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return await this.subCategoryRepository.find({
      where: { categoryId },
      order: { name: "ASC" },
    });
  }
}
