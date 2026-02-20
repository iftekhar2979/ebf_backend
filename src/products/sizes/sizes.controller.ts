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
import { SizesService } from "./sizes.service";
import { QuerySizeDto } from "./dtos/query-sizes.dto";
import { QueryVariantDto } from "./dtos/query-varient.dto";
import { UpdateSizeDto } from "./dtos/update-sizes.dto";
import { CreateSizeDto } from "./dtos/create-sizes.dto";

@Controller("sizes")
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  /**
   * Create a new size
   * POST /sizes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSizeDto: CreateSizeDto) {
    return this.sizesService.create(createSizeDto);
  }

  /**
   * Get all sizes with pagination and optional name filter
   * GET /sizes?page=1&limit=10&name=small
   */
  @Get()
  findAll(@Query() query: QuerySizeDto) {
    return this.sizesService.findAll(query);
  }

  /**
   * Get a single size by ID
   * GET /sizes/:id
   */
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.sizesService.findOne(id);
  }

  /**
   * Get all product variants by size ID with pagination
   * GET /sizes/:id/variants?page=1&limit=10
   */
  //   @Get(':id/variants')
  //   findVariantsBySizeId(
  //     @Param('id', ParseIntPipe) id: number,
  //     @Query() query: QueryVariantDto,
  //   ) {
  //     return this.sizesService.findVariantsBySizeId(id, query);
  //   }

  /**
   * Update a size
   * PATCH /sizes/:id
   */
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() updateSizeDto: UpdateSizeDto) {
    return this.sizesService.update(id, updateSizeDto);
  }

  /**
   * Delete a size
   * DELETE /sizes/:id
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.sizesService.remove(id);
  }
}
