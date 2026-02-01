import { Module } from '@nestjs/common';
import { VarientsController } from './varients.controller';

@Module({
  controllers: [VarientsController]
})
export class VarientsModule {}
