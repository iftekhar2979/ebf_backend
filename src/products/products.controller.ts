import {
  Body,
  ClassSerializerInterceptor,
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
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { Roles } from "src/user/decorators/roles.decorator";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { CreateProductDto } from "./dto/CreateProduct.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";
import { ProductFilters } from "./types/productFilters";

@Controller("products")
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthenticationGuard, RolesGuard)
  @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto, @GetUser() user: User) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  // @Roles(UserRoles.SHOP_OWNER, UserRoles.USER, UserRoles.ADMIN)
  async findAll(
    @Query("userId") userId?: string,
    @Query("subCategoryId", new ParseIntPipe({ optional: true })) subCategoryId?: number,
    @Query("targetedGender") targetedGender?: string,
    @Query("minPrice", new ParseIntPipe({ optional: true })) minPrice?: number,
    @Query("maxPrice", new ParseIntPipe({ optional: true })) maxPrice?: number,
    @Query("hasDiscount") hasDiscount?: string,
    @Query("search") search?: string,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    const filters: ProductFilters = {
      userId,
      subCategoryId,
      targetedGender,
      minPrice,
      maxPrice,
      hasDiscount: hasDiscount === "true",
      search,
      page,
      limit,
    };

    return this.productsService.findAll(filters);
  }

  @Get("trending")
  // @UseGuards(JwtAuthenticationGuard, RolesGuard)
  async getTrending(@Query("limit", new ParseIntPipe({ optional: true })) limit?: number) {
    return this.productsService.getTrendingProducts(limit || 10);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id);

    // Track view asynchronously
    this.productsService.incrementView(id);

    return product;
  }

  @Patch(":id")
  async update(@Param("id", ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
