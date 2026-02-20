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
    Req,
} from "@nestjs/common";
import { CartService } from "./carts.service";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * GET /cart
   * Returns the full active cart with items (cache-first).
   */
  @Get()
  getCart(@Req() req: Request) {
    return this.cartService.getCart(req["user"].id);
  }

  /**
   * GET /cart/count
   * Returns item count badge number from Redis counter (O(1)).
   */
  @Get("count")
  async getCount(@Req() req: Request) {
    const count = await this.cartService.getCartItemCount(req["user"].id);
    return { count };
  }

  /**
   * POST /cart/items
   * Enqueues an add-to-cart job. Returns 202 Accepted immediately.
   */
  @Post("items")
  @HttpCode(HttpStatus.ACCEPTED)
  addItem(@Req() req: Request, @Body() dto) {
    return this.cartService.addItem(req["user"].id, {
      userId: req["user"].id,
      productId: dto.productId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      price: dto.price,
      sku: dto.sku,
    });
  }

  /**
   * PATCH /cart/items/:itemId
   * Enqueues an update-quantity job. Returns 202 Accepted immediately.
   */
  @Patch("items/:itemId")
  @HttpCode(HttpStatus.ACCEPTED)
  updateItem(@Req() req: Request, @Param("itemId", ParseIntPipe) itemId: number, @Body() dto) {
    return this.cartService.updateItem(req["user"].id, itemId, dto.quantity);
  }

  /**
   * DELETE /cart/items/:itemId
   * Enqueues a remove job. Returns 202 Accepted immediately.
   */
  @Delete("items/:itemId")
  @HttpCode(HttpStatus.ACCEPTED)
  removeItem(@Req() req: Request, @Param("itemId", ParseIntPipe) itemId: number) {
    return this.cartService.removeItem(req["user"].id, itemId);
  }
}
