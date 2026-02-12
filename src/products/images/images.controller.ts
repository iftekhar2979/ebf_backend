import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { CreateProductImageDto } from 'src/products/dto/create-product.dto';

@Controller('products/:productId/images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createImageDto: CreateProductImageDto,
  ) {
    return this.imagesService.create(productId, createImageDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createImagesDto: { images: CreateProductImageDto[] },
  ) {
    return this.imagesService.bulkCreate(productId, createImagesDto.images);
  }

  @Post('replace-all')
  @HttpCode(HttpStatus.OK)
  async replaceAll(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() replaceImagesDto: { images: CreateProductImageDto[] },
  ) {
    return this.imagesService.replaceAll(productId, replaceImagesDto.images);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() reorderDto: { imageIds: number[] },
  ) {
    return this.imagesService.reorder(productId, reorderDto.imageIds);
  }

  @Get()
  async findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.imagesService.findByProduct(productId);
  }

  @Get('primary')
  async getPrimaryImage(@Param('productId', ParseIntPipe) productId: number) {
    return this.imagesService.getPrimaryImage(productId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.imagesService.findOne(id);
  }

  @Patch(':imageId')
  async update(
    @Param('imageId', ParseIntPipe) id: number,
    @Body() updateImageDto: CreateProductImageDto,
  ) {
    return this.imagesService.update(id, updateImageDto);
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('imageId', ParseIntPipe) id: number) {
    return this.imagesService.remove(id);
  }

  @Delete('bulk/delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() deleteDto: { imageIds: number[] },
  ) {
    return this.imagesService.bulkDelete(productId, deleteDto.imageIds);
  }
}