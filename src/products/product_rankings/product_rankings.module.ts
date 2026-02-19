import { Module } from '@nestjs/common';
import { ProductRankingService } from './product_rankings.service';

@Module({})
export class ProductRankingsModule {
    imports:[]
    exports:[
        ProductRankingService
    ]
}
