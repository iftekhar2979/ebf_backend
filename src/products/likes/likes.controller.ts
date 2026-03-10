import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
import { LikesService } from "./likes.service";

@ApiTags("Product Likes")
@ApiBearerAuth()
@Controller("products/:productId/likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post("toggle")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({ summary: "Toggle like status for a product" })
  async toggleLike(
    @Param("productId", ParseIntPipe) productId: number,
    @GetUser() user: User
  ) {
    return this.likesService.toggleLike(productId, user);
  }

  @Get("status")
  @UseGuards(JwtAuthenticationGuard)
  @ApiOperation({ summary: "Check if the current user liked the product" })
  async checkLikeStatus(
    @Param("productId", ParseIntPipe) productId: number,
    @GetUser() user: User
  ) {
    const isLiked = await this.likesService.isLiked(productId, user.id);
    return { isLiked };
  }
}
