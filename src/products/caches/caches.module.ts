import { Module } from "@nestjs/common";
import { ProductCacheService } from "./caches.service";

@Module({
  providers: [ProductCacheService],
  exports: [ProductCacheService],
})
export class CachesModule {}
