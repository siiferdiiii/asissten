import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.trip.create({
      data: {
        ...dto,
        createdById: userId,
        status: TripStatus.planning,
      },
    });
  }

  async update(id: string, dto: UpdateTripDto, doctorProfileId: string) {
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

    return this.prisma.trip.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string, doctorProfileId: string) {
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

    return { success: true };
  }
}
