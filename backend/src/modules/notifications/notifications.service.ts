import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationEntityType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async findAll(recipientUserId: string, query: QueryNotificationDto) {
    const { isRead, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      recipientUserId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [total, notifications] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: where as never }),
      this.prisma.notification.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(recipientUserId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientUserId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, recipientUserId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, recipientUserId },
    });
    if (!existing) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(recipientUserId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  /**
   * Internal helper to create a single notification and dispatch via socket
   */
  async createNotification(
    recipientUserId: string,
    title: string,
    body: string,
    entityType?: NotificationEntityType,
    entityId?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientUserId,
        title,
        body,
        entityType,
        entityId,
      },
    });

    // Emit realtime event to personal user room
    this.gateway.emitToUserRoom(recipientUserId, 'notification.created', {
      data: notification,
    });

    return notification;
  }

  /**
   * Broadcast a notification to all active team members in a doctor profile except the actor
   */
  async notifyMembers(
    doctorProfileId: string,
    actorUserId: string,
    title: string,
    body: string,
    entityType: NotificationEntityType,
    entityId: string,
  ) {
    const memberships = await this.prisma.membership.findMany({
      where: { doctorProfileId, status: 'active' },
      select: { userId: true },
    });

    for (const m of memberships) {
      if (m.userId !== actorUserId) {
        await this.createNotification(m.userId, title, body, entityType, entityId);
      }
    }
  }
}
