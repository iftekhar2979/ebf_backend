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
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Max, Min } from "class-validator";
import { RolesGuard } from "src/auth/guards/roles-auth.guard";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { Roles } from "src/user/decorators/roles.decorator";
import { UserRoles } from "src/user/enums/role.enum";
import { ProductEventType } from "./entities/events.entity";
import { EventsService } from "./events.service";

// DTOs
export class TrackEventRequestDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsString()
  userId: string;

  @IsEnum(ProductEventType)
  eventType: ProductEventType;

  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;
}

export class BatchTrackEventsDto {
  events: TrackEventRequestDto[];
}

export class GetEventHistoryQueryDto {
  @IsEnum(ProductEventType)
  @IsOptional()
  eventType?: ProductEventType;

  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  @IsOptional()
  limit: number = 100;
}

export class GetTrendingQueryDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit: number = 20;
}

@ApiTags("Product Events")
@Controller("events")
@UseGuards(JwtAuthenticationGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("track")
  @Roles(UserRoles.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Track a product event" })
  @ApiResponse({ status: 200, description: "Event tracked successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async trackEvent(@Body() dto: TrackEventRequestDto) {
    const result = await this.eventsService.trackEvent(dto);

    return {
      success: result.tracked,
      message: result.tracked ? "Event tracked successfully" : "Failed to track event",
      buffered: result.buffered,
    };
  }

  @Post("track/batch")
  @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Track multiple events in a batch" })
  @ApiResponse({ status: 200, description: "Batch tracking completed" })
  async batchTrackEvents(@Body() dto: BatchTrackEventsDto) {
    const result = await this.eventsService.batchTrackEvents(dto.events);

    return {
      success: true,
      tracked: result.tracked,
      failed: result.failed,
      total: dto.events.length,
    };
  }

  @Get("product/:productId/stats")
    @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get real-time event stats for a product" })
  @ApiResponse({ status: 200, description: "Stats retrieved successfully" })
  async getEventStats(@Param("productId", ParseIntPipe) productId: number) {
    return this.eventsService.getEventStats(productId);
  }

  @Get("product/:productId/history")
    @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get event history for a product" })
  @ApiResponse({ status: 200, description: "Event history retrieved successfully" })
  async getEventHistory(
    @Param("productId", ParseIntPipe) productId: number,
    @Query() query: GetEventHistoryQueryDto
  ) {
    return this.eventsService.getEventHistory(productId, query.eventType, query.limit);
  }

  @Get("product/:productId/conversion-funnel")
    @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get conversion funnel metrics for a product" })
  @ApiResponse({ status: 200, description: "Conversion funnel retrieved successfully" })
  async getConversionFunnel(@Param("productId", ParseIntPipe) productId: number) {
    return this.eventsService.getConversionFunnel(productId);
  }

  @Get("trending")
  @Roles(UserRoles.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get trending products based on recent events" })
  @ApiResponse({ status: 200, description: "Trending products retrieved successfully" })
  async getTrendingProducts(@Query() query: GetTrendingQueryDto) {
    return this.eventsService.getTrendingProducts(query.limit);
  }

  // Quick tracking endpoints for common events

  @Post("view/:productId")
  @Roles(UserRoles.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quick track a product view" })
  async trackView(
    @Param("productId", ParseIntPipe) productId: number,
    @Body("userId", ParseIntPipe) userId: string
  ) {
    return this.eventsService.trackEvent({
      productId,
      userId,
      eventType: ProductEventType.VIEW,
    });
  }

  @Post("cart/:productId")
  @Roles(UserRoles.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quick track add to cart" })
  async trackCart(
    @Param("productId", ParseIntPipe) productId: number,
    @Body("userId", ParseIntPipe) userId: string,
    @Body("quantity") quantity?: number
  ) {
    return this.eventsService.trackEvent({
      productId,
      userId,
      eventType: ProductEventType.ADD_TO_CART,
      quantity: quantity || 1,
    });
  }

  @Post("order/:productId") 
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quick track an order" })
  @ApiBearerAuth()
  async trackOrder(
    @Param("productId", ParseIntPipe) productId: number,
    @Body("userId") userId: string,
    @Body("quantity") quantity?: number
  ) {
    return this.eventsService.trackEvent({
      productId,
      userId,
      eventType: ProductEventType.ORDER,
      quantity: quantity || 1,
    });
  }
}
