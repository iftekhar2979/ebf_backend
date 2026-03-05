import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { CreateReelDto } from "./dto/create-reel.dto";
import { UpdateReelDto } from "./dto/update-reel.dto";
import { Reel, ReelStatus } from "./entities/reels.entity";

@Injectable()
export class ReelsService {
  private readonly REELS_CACHE_KEY = "public_reels_feed";
  private readonly CACHE_TTL = 300; // 5 minutes cache

  constructor(
    @InjectRepository(Reel)
    private readonly reelsRepository: Repository<Reel>,
    private readonly redisService: RedisService
  ) {}

  async create(userId: string, createReelDto: CreateReelDto): Promise<Reel> {
    const reel = this.reelsRepository.create({
      ...createReelDto,
      userId,
      status: createReelDto.status || ReelStatus.DRAFT,
    });
    
    const savedReel = await this.reelsRepository.save(reel);

    if (savedReel.status === ReelStatus.PUBLIC) {
      // Invalidate cache if a new public reel is created
      await this.redisService.delCache(this.REELS_CACHE_KEY);
    }

    return savedReel;
  }

  async findAllPublic({page,limit}: {page: number, limit: number}): Promise<{ items: Reel[]; total: number }> {

    page = page || 1;
    limit = limit || 10;
    const skip = (page - 1) * limit;
    const cacheKey = `${this.REELS_CACHE_KEY}_page_${page}_limit_${limit}`;

    const cached = await this.redisService.getCache(cacheKey);
    if (cached) {
      if (typeof cached === "string") {
        try {
          return JSON.parse(cached);
        } catch (e) {
          // Fallback to database if parsing fails
        }
      } else {
        return cached as any;
      }
    }

    const [items, total] = await this.reelsRepository.findAndCount({
      where: { status: ReelStatus.PUBLIC },
      order: { createdAt: "DESC" },
      relations: ["user"],
      skip,
      take: limit,
    });

    const result = { items, total };
    await this.redisService.setCacheWithTTL(
      cacheKey,
      JSON.stringify(result),
      this.CACHE_TTL
    );

    return result;
  }

  async findOne(id: number): Promise<Reel> {
    const reel = await this.reelsRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!reel) {
      throw new NotFoundException(`Reel with ID ${id} not found`);
    }

    // Increment views (simple approach, could also use redis for high concurrency counting)
    await this.reelsRepository.increment({ id }, "views", 1);
    reel.views += 1;

    return reel;
  }

  async update(id: number, userId: string, updateReelDto: UpdateReelDto): Promise<Reel> {
    const reel = await this.findOne(id);

    // Normally would check if userId matches reel.userId for authorization here

    Object.assign(reel, updateReelDto);
    const updatedReel = await this.reelsRepository.save(reel);

    // Invalidate public feed cache if status or url changes
    await this.redisService.delCache(this.REELS_CACHE_KEY);

    return updatedReel;
  }

  async remove(id: number, userId: string): Promise<void> {
    const reel = await this.findOne(id);
    
    // Authorization check would go here

    // Soft delete
    await this.reelsRepository.softRemove(reel);
    
    // Invalidate cache
    await this.redisService.delCache(this.REELS_CACHE_KEY);
  }
}
