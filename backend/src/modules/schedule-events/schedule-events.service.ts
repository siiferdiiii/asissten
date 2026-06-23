import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dto/update-schedule-event.dto';
import { QueryScheduleEventDto } from './dto/query-schedule-event.dto';
import { EventStatus, MembershipRole } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScheduleEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: QueryScheduleEventDto) {
    const { doctorProfileId, from, to, type, tripId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {
      doctorProfileId,
      deletedAt: null,
    };

    if (from) {
      where.startDatetime = { ...(where.startDatetime || {}), gte: from };
    }

    if (to) {
      where.startDatetime = { ...(where.startDatetime || {}), lte: to };
    }

    if (type) {
      where.type = type;
    }

    if (tripId) {
      where.tripId = tripId;
    }

    if (status) {
      where.status = status;
    }

    const [total, events] = await this.prisma.$transaction([
      this.prisma.scheduleEvent.count({ where }),
      this.prisma.scheduleEvent.findMany({
        where,
        orderBy: { startDatetime: 'asc' },
        skip,
        take,
      }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, doctorProfileId: string) {
    const event = await this.prisma.scheduleEvent.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException(`Schedule event with ID ${id} not found`);
    }

    return event;
  }

  async create(dto: CreateScheduleEventDto, userId: string) {
    if (dto.endDatetime <= dto.startDatetime) {
      throw new BadRequestException('endDatetime must be after startDatetime');
    }

    if (dto.isRecurring && !dto.recurrenceRule) {
      throw new BadRequestException('recurrenceRule is required when isRecurring is true');
    }

    // Check overlap (non-blocking)
    const conflicts = await this.prisma.scheduleEvent.findMany({
      where: {
        doctorProfileId: dto.doctorProfileId,
        deletedAt: null,
        status: { not: EventStatus.cancelled },
        AND: [
          { startDatetime: { lt: dto.endDatetime } },
          { endDatetime: { gt: dto.startDatetime } },
        ],
      },
      select: {
        id: true,
        title: true,
        startDatetime: true,
        endDatetime: true,
      },
    });

    const warnings = conflicts.length > 0 ? [
      {
        type: 'overlap',
        conflictsWith: conflicts,
      },
    ] : [];

    const event = await this.prisma.scheduleEvent.create({
      data: {
        ...dto,
        createdById: userId,
      },
    });

    this.gateway.emitToDoctorRoom(dto.doctorProfileId, 'schedule_event.created', {
      data: event,
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      dto.doctorProfileId,
      userId,
      'Jadwal Baru Dibuat',
      `Jadwal "${event.title}" (${event.type}) telah ditambahkan.`,
      'schedule_event',
      event.id,
    );

    return { data: event, warnings };
  }

  async update(id: string, dto: UpdateScheduleEventDto, doctorProfileId: string, userId: string) {
    const existing = await this.prisma.scheduleEvent.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule event with ID ${id} not found`);
    }

    const start = dto.startDatetime ?? existing.startDatetime;
    const end = dto.endDatetime ?? existing.endDatetime;

    if (end <= start) {
      throw new BadRequestException('endDatetime must be after startDatetime');
    }

    const isRecurringMerged = dto.isRecurring ?? existing.isRecurring;
    const ruleMerged = dto.recurrenceRule ?? existing.recurrenceRule;

    if (isRecurringMerged && !ruleMerged) {
      throw new BadRequestException('recurrenceRule is required when isRecurring is true');
    }

    // Check overlap (excluding this event itself)
    const conflicts = await this.prisma.scheduleEvent.findMany({
      where: {
        doctorProfileId,
        deletedAt: null,
        id: { not: id },
        status: { not: EventStatus.cancelled },
        AND: [
          { startDatetime: { lt: end } },
          { endDatetime: { gt: start } },
        ],
      },
      select: {
        id: true,
        title: true,
        startDatetime: true,
        endDatetime: true,
      },
    });

    const warnings = conflicts.length > 0 ? [
      {
        type: 'overlap',
        conflictsWith: conflicts,
      },
    ] : [];

    const updated = await this.prisma.scheduleEvent.update({
      where: { id },
      data: dto,
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'schedule_event.updated', {
      data: updated,
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      userId,
      'Jadwal Diperbarui',
      `Jadwal "${updated.title}" telah diperbarui.`,
      'schedule_event',
      updated.id,
    );

    return { data: updated, warnings };
  }

  async confirm(id: string, doctorProfileId: string, role: MembershipRole, userId: string) {
    const event = await this.prisma.scheduleEvent.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException(`Schedule event with ID ${id} not found`);
    }

    if (event.status === EventStatus.confirmed || event.status === EventStatus.cancelled) {
      throw new BadRequestException('Event is already confirmed or cancelled');
    }

    const updated = await this.prisma.scheduleEvent.update({
      where: { id },
      data: { status: EventStatus.confirmed },
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'schedule_event.statusChanged', {
      data: updated,
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      userId,
      'Jadwal Dikonfirmasi',
      `Jadwal "${updated.title}" telah dikonfirmasi oleh ${role}.`,
      'schedule_event',
      updated.id,
    );

    return updated;
  }

  async softDelete(id: string, doctorProfileId: string, _scope: 'this' | 'this_and_following', userId: string) {
    const existing = await this.prisma.scheduleEvent.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule event with ID ${id} not found`);
    }

    await this.prisma.scheduleEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'schedule_event.deleted', {
      data: { id },
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      userId,
      'Jadwal Dihapus',
      `Jadwal "${existing.title}" telah dihapus.`,
      'schedule_event',
      id,
    );

    return { success: true };
  }
}
