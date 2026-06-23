import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { TripStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: QueryTripDto) {
    const { doctorProfileId, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {
      doctorProfileId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { destinationCity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, trips] = await this.prisma.$transaction([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take,
      }),
    ]);

    return {
      data: trips,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, doctorProfileId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return trip;
  }

  async create(dto: CreateTripDto, userId: string) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    // Verify doctor profile exists
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { id: dto.doctorProfileId },
    });
    if (!doctorProfile) {
      throw new NotFoundException(`Doctor profile ${dto.doctorProfileId} not found`);
    }

    const trip = await this.prisma.trip.create({
      data: {
        ...dto,
        createdById: userId,
        status: TripStatus.planning,
      },
    });

    this.gateway.emitToDoctorRoom(dto.doctorProfileId, 'trip.created', {
      data: trip,
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      dto.doctorProfileId,
      userId,
      'Trip Baru Dibuat',
      `Trip "${trip.title}" ke ${trip.destinationCity} telah dibuat.`,
      'trip',
      trip.id,
    );

    return trip;
  }

  async update(id: string, dto: UpdateTripDto, doctorProfileId: string, userId: string) {
    const existing = await this.prisma.trip.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    if (dto.status === TripStatus.ongoing || dto.status === TripStatus.completed) {
      throw new BadRequestException('Status ongoing/completed can only be updated by background jobs');
    }

    const mergedStartDate = dto.startDate ?? existing.startDate;
    const mergedEndDate = dto.endDate ?? existing.endDate;

    if (mergedEndDate < mergedStartDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: dto,
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'trip.updated', {
      data: updated,
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      userId,
      'Trip Diperbarui',
      `Trip "${updated.title}" telah diperbarui.`,
      'trip',
      updated.id,
    );

    return updated;
  }

  async softDelete(id: string, doctorProfileId: string, userId: string) {
    const existing = await this.prisma.trip.findFirst({
      where: {
        id,
        doctorProfileId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id },
        data: { deletedAt: now },
      }),
      this.prisma.hotel.updateMany({
        where: { tripId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.scheduleEvent.updateMany({
        where: { tripId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.task.updateMany({
        where: { tripId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    this.gateway.emitToDoctorRoom(doctorProfileId, 'trip.deleted', {
      data: { id, doctorProfileId },
      actorId: userId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      userId,
      'Trip Dihapus',
      `Trip "${existing.title}" telah dihapus beserta akomodasi, jadwal, dan tugas terkait.`,
      'trip',
      id,
    );

    return { success: true };
  }
}
