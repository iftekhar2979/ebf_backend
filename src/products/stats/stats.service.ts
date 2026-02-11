import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductStat } from './entities/product_stats.entity';
import { Repository } from 'typeorm';
import { OmitType } from '@nestjs/mapped-types';
import { RedisService } from 'src/redis/redis.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(ProductStat) private readonly productStatistics:Repository<ProductStat>,
        //  @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ){
        
    }
//     create(dto:ProductStat[]){
//  try{


//  }catch(err){

//  }
//     }
}
