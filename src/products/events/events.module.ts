import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ProductEvent } from './entities/events.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { EventQueueProcessor } from 'src/bull/processors/Event.queue.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEvent]),
    BullModule.registerQueue(
      {
        name: 'event-queue',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'product-queue',
      },
    ),
    ScheduleModule.forRoot(),
    // RedisModule,
  ],
  controllers: [EventsController],
  providers: [EventsService,],
  exports: [EventsService],
})
export class EventsModule {}
