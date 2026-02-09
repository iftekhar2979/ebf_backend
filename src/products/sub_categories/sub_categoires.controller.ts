import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubCategoriesService } from './sub_categories.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { QuerySubCategoryDto } from './dto/query-sub-category.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Controller('subcategories')
export class SubCategoriesController {
  constructor(
    private readonly subCategoriesService: SubCategoriesService,
  ) {}

  /**
   * Create a new subcategory
   * POST /subcategories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoriesService.create(createSubCategoryDto);
  }

  /**
   * Get all subcategories with pagination and filtering
   * GET /subcategories?page=1&limit=10&name=shirts&categoryId=1
   */
  @Get()
  findAll(@Query() query: QuerySubCategoryDto) {
    return this.subCategoriesService.findAll(query);
  }

  /**
   * Get all subcategories with products count
   * GET /subcategories/with-count?page=1&limit=10
   */
  @Get('with-count')
  findAllWithCount(@Query() query: QuerySubCategoryDto) {
    return this.subCategoriesService.findAllWithProductCount(query);
  }

  /**
   * Get subcategories by category ID (for dropdowns)
   * GET /subcategories/by-category/:categoryId
   */
  @Get('by-category/:categoryId')
  findByCategoryId(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.subCategoriesService.findByCategoryId(categoryId);
  }

  /**
   * Get a single subcategory by ID
   * GET /subcategories/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subCategoriesService.findOne(id);
  }

  /**
   * Get a single subcategory by ID with products count
   * GET /subcategories/:id/with-count
   */
  @Get(':id/with-count')
  findOneWithCount(@Param('id', ParseIntPipe) id: number) {
    return this.subCategoriesService.findOneWithCount(id);
  }

  /**
   * Get all products by subcategory ID with pagination
   * GET /subcategories/:id/products?page=1&limit=10
   */
  @Get(':id/products')
  findProductsBySubCategoryId(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryProductDto,
  ) {
    return this.subCategoriesService.findProductsBySubCategoryId(id, query);
  }

  /**
   * Update a subcategory
   * PATCH /subcategories/:id
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ) {
    return this.subCategoriesService.update(id, updateSubCategoryDto);
  }

  /**
   * Delete a subcategory
   * DELETE /subcategories/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subCategoriesService.remove(id);
  }
}