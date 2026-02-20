import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, Req } from "@nestjs/common";
import { Request } from "express";
import { ViewsService } from "./views.service";

@Controller("views")
export class ViewsController {
  constructor(private readonly productViewService: ViewsService) {}

  /**
   * POST /products/:id/view
   * Fire-and-forget; responds 204 immediately after buffering.
   */
  @Post(":id/view")
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordView(@Param("id", ParseIntPipe) productId: number, @Req() req: Request): Promise<void> {
    const userId: number = (req as any).user?.id;
    await this.productViewService.trackView(productId, userId);
  }

  /**
   * GET /products/:id/views/count
   * Served from Redis counter – O(1), no DB hit.
   */
  @Get(":id/views/count")
  async getViewCount(
    @Param("id", ParseIntPipe) productId: number
  ): Promise<{ productId: number; views: number }> {
    const views = await this.productViewService.getProductViewCount(productId);
    return { productId, views };
  }

  /**
   * GET /products/views/history?page=1&limit=20
   * Returns the authenticated user's view history.
   */
  @Get("views/history")
  async getUserHistory(
    @Req() req: Request,
    @Query("page", ParseIntPipe) page = 1,
    @Query("limit", ParseIntPipe) limit = 20
  ) {
    const userId: number = (req as any).user?.id;
    return this.productViewService.getUserViewHistory(userId, page, limit);
  }
}
