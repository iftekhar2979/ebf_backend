import { CART_ADD_JOB, CART_REMOVE_JOB, CART_UPDATE_JOB } from "./ carts.queue";
/* eslint-disable prettier/prettier */
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { DataSource, Repository } from "typeorm";
import { Logger } from "winston";
import { RedisService } from "../redis/redis.service";
import { InjectLogger } from "../shared/decorators/logger.decorator";
import { CART_QUEUE } from "./ carts.queue";
import { } from "./../bull/processors/cart.queue";
import { CartItem } from "./cart_items/entities/cart_items.entity";
import { Cart, CartStatus } from "./entities/carts.entity";

const CART_CACHE_TTL = 300; // 5 min
const CART_KEY = (userId: number) => `cart:user:${userId}`;
const CART_ITEM_COUNT_KEY = (userId: number) => `cart:count:${userId}`;

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectQueue(CART_QUEUE)
    private readonly cartQueue: Queue,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    @InjectLogger() private readonly logger: Logger
  ) {}

  // ─── Read (Cache-First) ───────────────────────────────────────────────────

  /**
   * Get active cart for user.
   * Pattern: Cache-aside with Redis. Single DB query with joins on miss.
   */
  async getCart(userId: number): Promise<Cart> {
    const cacheKey = CART_KEY(userId);

    // 1. Try cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as Cart;

    // 2. DB fallback – one query with items + variants
    const cart = await this.cartRepo.findOne({
      where: { userId, status: CartStatus.ACTIVE },
      relations: [
        "cartItems",
        "cartItems.product",
        "cartItems.productVariant",
        "cartItems.productVariant.color",
        "cartItems.productVariant.size",
      ],
    });

    if (!cart) {
      throw new NotFoundException("Active cart not found");
    }

    await this.redisService.setEx(cacheKey, JSON.stringify(cart), CART_CACHE_TTL);
    return cart;
  }

  // ─── Write (Queue-First) ──────────────────────────────────────────────────

  /**
   * Add item to cart.
   * Responds immediately after enqueueing; worker persists asynchronously.
   * Optimistic Redis counter update keeps UI snappy.
   */
  async addItem(userId: number, data: any): Promise<{ queued: true }> {
    // Optimistic: increment cart item count in Redis immediately
    await this.redisService.incrBy(CART_ITEM_COUNT_KEY(userId), data.quantity);
    // Invalidate cart cache so next read is fresh after worker persists
    await this.redisService.del(CART_KEY(userId));

    await this.cartQueue.add(CART_ADD_JOB, data, {
      priority: 1,
      jobId: `cart-add-${userId}-${data.productVariantId}-${Date.now()}`,
      removeOnComplete: 50,
    });

    return { queued: true };
  }

  /**
   * Update item quantity.
   */
  async updateItem(userId: number, cartItemId: number, quantity: number): Promise<{ queued: true }> {
    await this.redisService.del(CART_KEY(userId));

    await this.cartQueue.add(CART_UPDATE_JOB, { cartItemId, userId, quantity } , {
      priority: 1,
      jobId: `cart-upd-${cartItemId}-${Date.now()}`,
      removeOnComplete: 50,
    });

    return { queued: true };
  }

  /**
   * Remove item from cart.
   */
  async removeItem(userId: number, cartItemId: number): Promise<{ queued: true }> {
    await this.redisService.del(CART_KEY(userId));

    const item = await this.cartItemRepo.findOne({
      where: { id: cartItemId },
      select: ["id", "productId", "quanity"],
    });

    if (!item) throw new NotFoundException("Cart item not found");

    await this.cartQueue.add(
      CART_REMOVE_JOB,
      {
        cartItemId,
        userId,
        productId: item.productId,
        quantity: item.quanity,
      },
      {
        priority: 1,
        jobId: `cart-rm-${cartItemId}`,
        removeOnComplete: 50,
      }
    );

    return { queued: true };
  }

  // ─── Worker Execution Methods (called by CartWorker) ─────────────────────

  /**
   * Actual DB persistence for add-to-cart.
   * Runs inside a transaction to keep cart total consistent.
   */
  async persistAddItem(data): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Upsert cart
      let cart = await manager.findOne(Cart, {
        where: { userId: data.userId, status: CartStatus.ACTIVE },
        lock: { mode: "pessimistic_write" },
      });

      if (!cart) {
        cart = manager.create(Cart, { userId: data.userId, total: 0 });
        cart = await manager.save(Cart, cart);
      }

      // Check if same variant already in cart → increment quantity
      const existing = await manager.findOne(CartItem, {
        where: { cartId: cart.id, productVarientId: data.productVariantId },
      });

      const itemTotal = Number(data.price) * data.quantity;

      if (existing) {
        existing.quanity += data.quantity;
        await manager.save(CartItem, existing);
      } else {
        const cartItem = manager.create(CartItem, {
          cartId: cart.id,
          productId: data.productId,
          productVarientId: data.productVariantId,
          quanity: data.quantity,
          price: data.price,
          sku: data.sku,
        });
        await manager.save(CartItem, cartItem);
      }

      // Update cart total
      await manager
        .createQueryBuilder()
        .update(Cart)
        .set({ total: () => `total + ${itemTotal}` })
        .where("id = :id", { id: cart.id })
        .execute();
    });
  }

  async persistUpdateItem(data): Promise<void> {
    const item = await this.cartItemRepo.findOne({
      where: { id: data.cartItemId },
    });
    if (!item) return;

    const diff = data.quantity - item.quanity;
    item.quanity = data.quantity;
    await this.cartItemRepo.save(item);

    // Update cart total delta
    await this.cartRepo
      .createQueryBuilder()
      .update(Cart)
      .set({ total: () => `total + ${diff * Number(item.price)}` })
      .where("id = :id", { id: item.cartId })
      .execute();
  }

  async persistRemoveItem(data): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(CartItem, {
        where: { id: data.cartItemId },
      });
      if (!item) return;

      const deduction = Number(item.price) * item.quanity;
      await manager.remove(CartItem, item);

      await manager
        .createQueryBuilder()
        .update(Cart)
        .set({ total: () => `GREATEST(0, total - ${deduction})` })
        .where("id = :id", { id: item.cartId })
        .execute();
    });
  }

  /**
   * Get item count from Redis counter (for badge display).
   */
  async getCartItemCount(userId: number): Promise<number> {
    const raw = await this.redisService.get(CART_ITEM_COUNT_KEY(userId));
    if (raw !== null) return parseInt(raw, 10);

    // Fallback: compute from DB and cache
    const result = await this.cartItemRepo
      .createQueryBuilder("ci")
      .innerJoin("ci.cart", "c")
      .where("c.userId = :userId AND c.status = :status", {
        userId,
        status: CartStatus.ACTIVE,
      })
      .select("SUM(ci.quanity)", "total")
      .getRawOne<{ total: string }>();

    const count = parseInt(result?.total ?? "0", 10);
    await this.redisService.setEx(CART_ITEM_COUNT_KEY(userId), String(count), CART_CACHE_TTL);
    return count;
  }
}
