import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { QueueProducerService } from "src/bull/queue-producer.service";
import { RedisService } from "src/redis/redis.service";
import { User } from "src/user/entities/user.entity";

/**
 * Example of a high-performance, scalable controller.
 * Demonstrates the use of the Enterprise Infrastructure Layer.
 */
@ApiTags("Enterprise Example")
@Controller("enterprise/example")
export class ScalableController {
  constructor(
    private readonly cacheManager: RedisService,
    private readonly queueProducer: QueueProducerService
  ) {}

  /**
   * Demonstrated Cached API Response.
   * Capable of handling massive concurrent reads with minimal DB load.
   */
  @Get("data/:id")
  @ApiOperation({ summary: "Fetch data with multi-layer caching" })
  async getCachedData(@Param("id") id: string) {
    const cacheKey = `enterprise:data:${id}`;
    
    // 1. Try L1/L2 Cache
    const cached = await this.cacheManager.get<{ id: string; val: string }>(cacheKey);
    if (cached) return cached;

    // 2. DB Fallback (Simulated)
    const dbData = { id, val: `Data for ${id}`, timestamp: new Date() };
    
    // 3. Populate Cache asynchronously (Fire-and-forget for speed)
    await this.cacheManager.set(cacheKey, dbData, { ttl: 300 });

    return dbData;
  }

  /**
   * Demonstrated High-Throughput Job Dispatching.
   * Offloads heavy processing to background workers.
   */
  @Post("process")
  @ApiOperation({ summary: "Dispatch heavy processing task" })
  async dispatchHeavyTask(@Body() data: any, @GetUser() user: User) {
    // Standardized dispatch via Enterprise Queue Producer
    const { jobId } = await this.queueProducer.dispatchTask("heavy_processing", {
      data,
      userId: user?.id,
      requestTime: new Date()
    });

    return { 
      status: "queued", 
      jobId,
      message: "Task has been accepted and is being processed in the background." 
    };
  }

  /**
   * Demonstrated Real-time Counter / Rate Limiting support.
   */
  @Get("hits")
  @ApiOperation({ summary: "Real-time hit counter using atomic Redis operations" })
  async getHitCount() {
    const totalHits = await this.cacheManager.increment("global:hits");
    return { totalHits };
  }
}
