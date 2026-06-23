import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TripStatus, NotificationEntityType, TaskStatus } from '@prisma/client';

interface WhatsAppPayload {
  to: string;
  message: string;
}

interface AppSheetApiResponse {
  success?: boolean;
  error?: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly appSheetApiUrl: string;
  private readonly appSheetApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.appSheetApiUrl = this.config.get<string>('APPSHEET_API_URL', '');
    this.appSheetApiKey = this.config.get<string>('APPSHEET_API_KEY', '');
  }

  /**
   * CRON 1: trip-status-sync
   * Runs every day at midnight.
   * Transitions: upcoming → ongoing (startDate passed), ongoing → completed (endDate passed).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncTripStatuses() {
    this.logger.log('[trip-status-sync] Running daily trip status sync…');
    const now = new Date();

    try {
      // planning/confirmed → ongoing: startDate has passed, endDate not yet passed
      const startedTrips = await this.prisma.trip.updateMany({
        where: {
          status: { in: [TripStatus.planning, TripStatus.confirmed] },
          startDate: { lte: now },
          endDate: { gte: now },
          deletedAt: null,
        },
        data: { status: TripStatus.ongoing },
      });
      this.logger.log(
        `[trip-status-sync] ${startedTrips.count} trips transitioned to ongoing`,
      );

      // ongoing → completed
      const completedTrips = await this.prisma.trip.updateMany({
        where: {
          status: TripStatus.ongoing,
          endDate: { lt: now },
          deletedAt: null,
        },
        data: { status: TripStatus.completed },
      });
      this.logger.log(
        `[trip-status-sync] ${completedTrips.count} trips transitioned ongoing → completed`,
      );
    } catch (err) {
      this.logger.error('[trip-status-sync] Error during sync:', err);
    }
  }

  /**
   * CRON 2: task-reminder-dispatch
   * Runs every minute.
   * Finds tasks with dueDate in the next 24 hours that are still open/in-progress,
   * and sends reminders to the assigned user.
   * Primary channel: WhatsApp via AppSheet Indonesia API (if APPSHEET_API_URL is set).
   * Fallback: In-app notification via NotificationsService.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchTaskReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h window

    let overdueTasks: Array<{
      id: string;
      title: string;
      dueDate: Date | null;
      doctorProfileId: string;
      assignedToId: string | null;
      assignedTo: { id: string; name: string; email: string } | null;
    }> = [];

    try {
      overdueTasks = await this.prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: windowEnd },
          status: { not: TaskStatus.done },
          assignedToId: { not: null },
          deletedAt: null,
        },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (err) {
      this.logger.error('[task-reminder-dispatch] Failed to fetch tasks:', err);
      return;
    }

    if (overdueTasks.length === 0) return;
    this.logger.log(
      `[task-reminder-dispatch] Processing ${overdueTasks.length} upcoming task(s)…`,
    );

    for (const task of overdueTasks) {
      if (!task.assignedTo) continue;

      const dueLabel = task.dueDate
        ? task.dueDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
        : 'segera';

      let waSent = false;

      // --- Primary: WhatsApp via AppSheet Indonesia API ---
      // The API expects an email or identifier as the "to" field.
      if (this.appSheetApiUrl && this.appSheetApiKey) {
        waSent = await this.sendWhatsApp({
          to: task.assignedTo.email,
          message: `🔔 *Pengingat Tugas*\nTask: *${task.title}*\nTenggat: ${dueLabel}\nSegera selesaikan tugas Anda.`,
        });
      }

      // --- Fallback: In-app notification ---
      if (!waSent) {
        if (!this.appSheetApiUrl) {
          this.logger.debug(
            `[task-reminder-dispatch] APPSHEET_API_URL not set, using in-app notification for user ${task.assignedTo.name}`,
          );
        } else {
          this.logger.warn(
            `[task-reminder-dispatch] WhatsApp failed for ${task.assignedTo.name}, falling back to in-app`,
          );
        }

        try {
          await this.notificationsService.createNotification(
            task.assignedTo.id,
            `⏰ Pengingat: ${task.title}`,
            `Tugas ini jatuh tempo pada ${dueLabel}. Segera selesaikan.`,
            NotificationEntityType.task,
            task.id,
          );
        } catch (notifErr) {
          this.logger.error(
            `[task-reminder-dispatch] In-app notification also failed for ${task.assignedTo.name}:`,
            notifErr,
          );
        }
      }
    }
  }

  /**
   * Sends a WhatsApp message via the AppSheet Indonesia API.
   * Returns true on success, false on failure.
   */
  private async sendWhatsApp(payload: WhatsAppPayload): Promise<boolean> {
    try {
      const response = await fetch(this.appSheetApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.appSheetApiKey,
        },
        body: JSON.stringify({
          to: payload.to,
          type: 'text',
          body: payload.message,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `[sendWhatsApp] HTTP ${response.status} from AppSheet API: ${text}`,
        );
        return false;
      }

      const result = (await response.json()) as AppSheetApiResponse;
      if (result.error) {
        this.logger.error(`[sendWhatsApp] API error: ${result.error}`);
        return false;
      }

      this.logger.debug(`[sendWhatsApp] Message sent to ${payload.to}`);
      return true;
    } catch (err) {
      this.logger.error(`[sendWhatsApp] Network/fetch error:`, err);
      return false;
    }
  }
}
