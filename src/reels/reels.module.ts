import { Module } from '@nestjs/common';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { ViewsModule } from './views/views.module';

@Module({
  controllers: [ReelsController],
  providers: [ReelsService],
  imports: [ViewsModule]
})
export class ReelsModule {}
