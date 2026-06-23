import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { MembershipRole, TaskStatus, NotificationEntityType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: QueryTaskDto) {
    const { doctorProfileId, status, assignedTo, priority, tripId, isOverdue, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      doctorProfileId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (assignedTo) where.assignedToId = assignedTo;
    if (priority) where.priority = priority;
    if (tripId) where.tripId = tripId;
    if (isOverdue === true) {
      where.dueDate = { lt: new Date() };
      where.status = { not: TaskStatus.done };
    }

    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where: where as never }),
      this.prisma.task.findMany({
        where: where as never,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        skip,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
    ]);

    return {
      data: tasks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto, actorUserId: string) {
    // Validate assignedToId is an active member of this doctorProfile
    if (dto.assignedToId) {
      const membership = await this.prisma.membership.findFirst({
        where: {
          userId: dto.assignedToId,
          doctorProfileId: dto.doctorProfileId,
          status: 'active',
        },
      });
      if (!membership) {
        throw new BadRequestException('assignedToId must be an active member of this doctor profile');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        doctorProfileId: dto.doctorProfileId,
        tripId: dto.tripId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        priority: dto.priority,
        status: dto.status,
        createdById: actorUserId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.gateway.emitToDoctorRoom(dto.doctorProfileId, 'task.created', {
      data: task,
      actorId: actorUserId,
    });

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actorUserId: string, role: MembershipRole, requestUserId: string) {
    const existing = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    // DR can only update status on tasks assigned to them
    if (role === MembershipRole.doctor) {
      if (existing.assignedToId !== requestUserId) {
        throw new ForbiddenException('Doctor can only update tasks assigned to them');
      }
      const restrictedFields = Object.keys(dto).filter((k) => k !== 'status');
      if (restrictedFields.length > 0) {
        throw new ForbiddenException('Doctor role can only update the status field');
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        tripId: dto.tripId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        priority: dto.priority,
        status: dto.status,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.gateway.emitToDoctorRoom(existing.doctorProfileId, 'task.updated', {
      data: updated,
      actorId: actorUserId,
    });

    // Notify team: flag status or assignment changes
    const notifyBody = dto.status
      ? `Task "${updated.title}" status changed to ${dto.status}`
      : `Task "${updated.title}" has been updated`;
    await this.notificationsService.notifyMembers(
      existing.doctorProfileId,
      actorUserId,
      'Task Updated',
      notifyBody,
      NotificationEntityType.task,
      id,
    );

    return updated;
  }

  async softDelete(id: string, actorUserId: string) {
    const existing = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.gateway.emitToDoctorRoom(existing.doctorProfileId, 'task.deleted', {
      data: { id, doctorProfileId: existing.doctorProfileId, tripId: existing.tripId },
      actorId: actorUserId,
    });

    // Notify team about deletion
    await this.notificationsService.notifyMembers(
      existing.doctorProfileId,
      actorUserId,
      'Task Deleted',
      `Task "${existing.title}" has been removed`,
      NotificationEntityType.task,
      id,
    );

    return { success: true };
  }
}
