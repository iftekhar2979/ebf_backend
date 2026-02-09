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
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';
import { QueryVariantDto } from './dto/query-varient.dto';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  /**
   * Create a new color
   * POST /colors
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createColorDto: CreateColorDto) {
    return this.colorsService.create(createColorDto);
  }

  /**
   * Get all colors without pagination (for dropdowns)
   * GET /colors/all
   */
  @Get('all')
  findAllColors() {
    return this.colorsService.findAllColors();
  }

  /**
   * Get all colors with pagination and optional name filter
   * GET /colors?page=1&limit=10&name=red
   */
  @Get()
  findAll(@Query() query: QueryColorDto) {
    return this.colorsService.findAll(query);
  }

  /**
   * Get all colors with variants count
   * GET /colors/with-count?page=1&limit=10
   */
  @Get('with-count')
  findAllWithCount(@Query() query: QueryColorDto) {
    return this.colorsService.findAllWithVariantCount(query);
  }

  /**
   * Get a single color by ID
   * GET /colors/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.findOne(id);
  }

  /**
   * Get a single color by ID with variants count
   * GET /colors/:id/with-count
   */
  @Get(':id/with-count')
  findOneWithCount(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.findOneWithCount(id);
  }

  /**
   * Get all product variants by color ID with pagination
   * GET /colors/:id/variants?page=1&limit=10
   */
  @Get(':id/variants')
  findVariantsByColorId(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryVariantDto,
  ) {
    return this.colorsService.findVariantsByColorId(id, query);
  }

  /**
   * Update a color
   * PATCH /colors/:id
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateColorDto: UpdateColorDto,
  ) {
    return this.colorsService.update(id, updateColorDto);
  }

  /**
   * Delete a color
   * DELETE /colors/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.colorsService.remove(id);
  }
}