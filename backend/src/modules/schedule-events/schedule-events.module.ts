import { Module } from '@nestjs/common';
import { ScheduleEventsService } from './schedule-events.service';
import { ScheduleEventsController } from './schedule-events.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [ScheduleEventsController],
  providers: [ScheduleEventsService],
  exports: [ScheduleEventsService],
})
export class ScheduleEventsModule {}

