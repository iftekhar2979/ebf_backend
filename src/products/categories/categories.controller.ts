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
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { QueryCategoryDto } from "./dto/query-category.dto";
import { QuerySubCategoryDto } from "./dto/query-subcategory.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category
   * POST /categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Get all categories with pagination and filtering
   * GET /categories?page=1&limit=10&name=electronics&description=gadgets
   */
  @Get()
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query);
  }

  /**
   * Get all categories with subcategories count
   * GET /categories/with-count?page=1&limit=10
   */
  @Get("with-count")
  findAllWithCount(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAllWithSubCategoryCount(query);
  }

  /**
   * Get a single category by ID
   * GET /categories/:id
   */
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  /**
   * Get a single category by ID with subcategories count
   * GET /categories/:id/with-count
   */
  @Get(":id/with-count")
  findOneWithCount(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.findOneWithCount(id);
  }

  /**
   * Get all subcategories by category ID with pagination
   * GET /categories/:id/subcategories?page=1&limit=10
   */
  @Get(":id/subcategories")
  findSubCategoriesByCategoryId(@Param("id", ParseIntPipe) id: number, @Query() query: QuerySubCategoryDto) {
    return this.categoriesService.findSubCategoriesByCategoryId(id, query);
  }

  /**
   * Update a category
   * PATCH /categories/:id
   */
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Delete a category
   * DELETE /categories/:id
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
