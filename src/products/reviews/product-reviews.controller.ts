import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { Roles } from "src/user/decorators/roles.decorator";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { CreateProductReviewDto } from "./dto/create-review.dto";
import { ProductReviewsService } from "./product-reviews.service";

@ApiTags("Product Reviews")
@Controller("products/:productId/reviews")
export class ProductReviewsController {
  constructor(private readonly reviewsService: ProductReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthenticationGuard, RolesGuard)
  @Roles(UserRoles.USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a product review with optional images" })
  async create(
    @Param("productId", ParseIntPipe) productId: number,
    @Body() createDto: CreateProductReviewDto,
    @GetUser() user: User
  ) {
    return this.reviewsService.create(productId, user, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all reviews for a product with pagination" })
  async findAll(
    @Param("productId", ParseIntPipe) productId: number,
    @Query() paginationDto: PaginationDto
  ) {
    return this.reviewsService.findAll(productId, paginationDto);
  }
}
