import { Module } from '@nestjs/common';
import { ScheduleEventsService } from './schedule-events.service';
import { ScheduleEventsController } from './schedule-events.controller';

@Module({
  controllers: [ScheduleEventsController],
  providers: [ScheduleEventsService],
  exports: [ScheduleEventsService],
})
export class ScheduleEventsModule {}
