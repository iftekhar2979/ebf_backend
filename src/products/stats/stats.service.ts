import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductStat } from './entities/product_stats.entity';
import { Repository } from 'typeorm';
import { OmitType } from '@nestjs/mapped-types';
import { RedisService } from 'src/redis/redis.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductCreatedJob } from 'src/bull/processors/productQueue';
@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(ProductStat) private readonly productStatistics:Repository<ProductStat>,
    ){
        
    }
    async create(dto:ProductCreatedJob){
 try{
    const product = this.productStatistics.create({productId:dto.productId ,totalBoostScore:0 , totalCarts:0, totalOrders:0 ,totalViews:0})
await this.productStatistics.save(product)

 }catch(err){
console.log(err)
 }
    }
}
