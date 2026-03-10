import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { Roles } from "src/user/decorators/roles.decorator";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { FavouritesService } from "./favourites.service";

@ApiTags("Favourites")
@ApiBearerAuth()
@Controller("favourites")
@UseGuards(JwtAuthenticationGuard, RolesGuard)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Post("toggle/:shopId")
  @Roles(UserRoles.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toggle a shop as favourite" })
  async toggle(@Param("shopId", ParseIntPipe) shopId: number, @GetUser() user: User) {
    return this.favouritesService.toggleFavourite(shopId, user);
  }

  @Get()
  @Roles(UserRoles.USER)
  @ApiOperation({ summary: "Get list of favourite shops with pagination" })
  async findAll(@GetUser() user: User, @Query() paginationDto: PaginationDto) {
    return this.favouritesService.getFavourites(user, paginationDto);
  }

  @Get(":shopId")
  @Roles(UserRoles.USER)
  @ApiOperation({ summary: "Check if a shop is in favorites" })
  async checkFavourite(@GetUser() user: User, @Param("shopId", ParseIntPipe) shopId: number) {
    return this.favouritesService.isFavourite(user.id, shopId);
  }
}
