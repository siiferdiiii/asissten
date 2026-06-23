import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TripsModule } from './modules/trips/trips.module';
import { ScheduleEventsModule } from './modules/schedule-events/schedule-events.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { PackingModule } from './modules/packing/packing.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { ActivityLogInterceptor } from './core/interceptors/activity-log.interceptor';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TripsModule,
    ScheduleEventsModule,
    RealtimeModule,
    HotelsModule,
    PackingModule,
    TasksModule,
    DocumentsModule,
    NotificationsModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global response wrapper interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global activity log interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
    // Global JWT guard — routes opt-out with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

