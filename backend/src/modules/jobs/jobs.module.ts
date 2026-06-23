import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [JobsService],
})
export class JobsModule {}
