import { Module } from '@nestjs/common';
import { BoostsController } from './boosts.controller';

@Module({
  controllers: [BoostsController]
})
export class BoostsModule {}
