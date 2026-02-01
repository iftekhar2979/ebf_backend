import { Module } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { RanksController } from './ranks.controller';

@Module({
  providers: [RanksService],
  controllers: [RanksController]
})
export class RanksModule {}
