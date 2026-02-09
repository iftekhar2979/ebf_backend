import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SubCategory } from '../sub_categories/entities/sub_categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { QuerySubCategoryDto } from './dto/query-subcategory.dto';
import { Category } from './entities/categories.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if category with same name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    try {
      const category = this.categoryRepository.create(createCategoryDto);
      return await this.categoryRepository.save(category);
    } catch (error) {
      throw new BadRequestException('Failed to create category');
    }
  }

  /**
   * Get all categories with pagination and filtering
   */
  async findAll(query: QueryCategoryDto) {
    const { page = 1, limit = 10, name, description } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {};

    // Filter by name (partial match)
    if (name) {
      whereCondition.name = Like(`%${name}%`);
    }

    // Filter by description (partial match)
    if (description) {
      whereCondition.description = Like(`%${description}%`);
    }

    const [data, total] = await this.categoryRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { createdAt: 'DESC' },
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
   * Get a single category by ID
   */
  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Get a single category by ID with subcategories count
   */
  async findOneWithCount(id: number) {
    const category = await this.findOne(id);

    const subCategoryCount = await this.subCategoryRepository.count({
      where: { category: { id } },
    });

    return {
      ...category,
      subCategoriesCount: subCategoryCount,
    };
  }

  /**
   * Get all subcategories by category ID with pagination
   */
  async findSubCategoriesByCategoryId(
    categoryId: number,
    query: QuerySubCategoryDto,
  ) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // First check if the category exists
    const category = await this.findOne(categoryId);

    const [data, total] = await this.subCategoryRepository.findAndCount({
      where: { category: { id: categoryId } },
      relations: ['category'],
      take: limit,
      skip: skip,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
        },
      },
    };
  }

  /**
   * Update a category
   */
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // If name is being updated, check for duplicates
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      throw new BadRequestException('Failed to update category');
    }
  }

  /**
   * Delete a category
   */
  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);

    // Check if category has associated subcategories
    const subCategoryCount = await this.subCategoryRepository.count({
      where: { category: { id } },
    });

    if (subCategoryCount > 0) {
      throw new BadRequestException(
        `Cannot delete category. It has ${subCategoryCount} associated subcategory(ies)`,
      );
    }

    await this.categoryRepository.remove(category);

    return {
      message: `Category with ID ${id} has been successfully deleted`,
    };
  }

  /**
   * Get categories with subcategories count
   */
  async findAllWithSubCategoryCount(query: QueryCategoryDto) {
    const result = await this.findAll(query);

    const dataWithCounts = await Promise.all(
      result.data.map(async (category) => {
        const subCategoryCount = await this.subCategoryRepository.count({
          where: { category: { id: category.id } },
        });
        return {
          ...category,
          subCategoriesCount: subCategoryCount,
        };
      }),
    );

    return {
      data: dataWithCounts,
      meta: result.meta,
    };
  }
}