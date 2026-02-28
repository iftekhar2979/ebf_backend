import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateProductVariantDto } from "src/products/dto/create-product.dto";
import { UpdateProductVariantDto } from "src/products/dto/update-product.dto";
import { VarientsService } from "./varients.service";

@Controller("products/:productId/variants")
export class VarientsController {
  constructor(private readonly varientsService: VarientsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() createVariantDto: CreateProductVariantDto
  ) {
    return this.varientsService.create(productId, createVariantDto);
  }

  @Post("bulk")
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() createVariantsDto: { variants: CreateProductVariantDto[] }
  ) {
    return this.varientsService.bulkCreate(productId, createVariantsDto.variants);
  }

  @Get()
  async findByProduct(@Param("productId", ParseIntPipe) productId: number) {
    return this.varientsService.findByProduct(productId);
  }

  // @Get("by-color")
  // async findByColor(
  //   @Param("productId", ParseIntPipe) productId: number,
  //   @Query("colorId", ParseIntPipe) colorId: number
  // ) {
  //   return this.varientsService.findByColor(productId, colorId);
  // }

  // @Get("by-size")
  // async findBySize(
  //   @Param("productId", ParseIntPipe) productId: number,
  //   @Query("sizeId", ParseIntPipe) sizeId: number
  // ) {
  //   return this.varientsService.findBySize(productId, sizeId);
  // }

  @Get("price-range")
  async findByPriceRange(
    @Param("productId", ParseIntPipe) productId: number,
    @Query("minPrice", ParseIntPipe) minPrice: number,
    @Query("maxPrice", ParseIntPipe) maxPrice: number
  ) {
    return this.varientsService.findByPriceRange(productId, minPrice, maxPrice);
  }

  // @Get("cheapest")
  // async getCheapest(@Param("productId", ParseIntPipe) productId: number) {
  //   return this.varientsService.getCheapestVariant(productId);
  // }

  // @Get("available-colors")
  // async getAvailableColors(@Param("productId", ParseIntPipe) productId: number) {
  //   return this.varientsService.getAvailableColors(productId);
  // }

  // @Get("available-sizes")
  // async getAvailableSizes(@Param("productId", ParseIntPipe) productId: number) {
  //   return this.varientsService.getAvailableSizes(productId);
  // }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.varientsService.findOne(id);
  }

  @Get("sku/:sku")
  async findBySku(@Param("sku") sku: string) {
    return this.varientsService.findBySku(sku);
  }

  @Patch(":varientId")
  async update(
    @Param("varientId", ParseIntPipe) id: number,
    @Body() updateVariantDto: UpdateProductVariantDto
  ) {
    return this.varientsService.update(id, updateVariantDto);
  }

  @Delete(":varientId")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id", ParseIntPipe) id: number) {
    return this.varientsService.remove(id);
  }
}
