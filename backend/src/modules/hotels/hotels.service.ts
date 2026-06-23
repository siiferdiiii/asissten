import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HotelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAllByTrip(tripId: string, doctorProfileId: string) {
    // Verify trip belongs to this doctor profile
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, doctorProfileId, deletedAt: null },
    });
    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }

    return this.prisma.hotel.findMany({
      where: { tripId, deletedAt: null },
      orderBy: { checkIn: 'asc' },
    });
  }

  async findOne(id: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { id, deletedAt: null },
    });
    if (!hotel) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }
    return hotel;
  }

  async create(tripId: string, dto: CreateHotelDto, actorUserId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });
    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }

    if (dto.checkOut <= dto.checkIn) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const hotel = await this.prisma.hotel.create({
      data: {
        tripId,
        name: dto.name,
        formattedAddress: dto.formattedAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        placeId: dto.placeId,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        bookingStatus: dto.bookingStatus,
        bookingReference: dto.bookingReference,
        price: dto.price !== undefined ? dto.price : undefined,
        currency: dto.currency,
        platform: dto.platform,
        notes: dto.notes,
      },
    });

    // Emit socket event after DB commit
    this.gateway.emitToDoctorRoom(trip.doctorProfileId, 'hotel.created', {
      data: hotel,
      actorId: actorUserId,
    });

    await this.notificationsService.notifyMembers(
      trip.doctorProfileId,
      actorUserId,
      'Booking Hotel Baru',
      `Hotel "${hotel.name}" telah ditambahkan untuk Trip "${trip.title}".`,
      'hotel',
      hotel.id,
    );

    return hotel;
  }

  async update(id: string, dto: UpdateHotelDto, actorUserId: string) {
    const existing = await this.prisma.hotel.findFirst({
      where: { id, deletedAt: null },
      include: { trip: { select: { doctorProfileId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    const newCheckIn = dto.checkIn ? new Date(dto.checkIn) : existing.checkIn;
    const newCheckOut = dto.checkOut ? new Date(dto.checkOut) : existing.checkOut;
    if (newCheckOut <= newCheckIn) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const updated = await this.prisma.hotel.update({
      where: { id },
      data: {
        name: dto.name,
        formattedAddress: dto.formattedAddress,
        latitude: dto.latitude,
        longitude: dto.longitude,
        placeId: dto.placeId,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        bookingStatus: dto.bookingStatus,
        bookingReference: dto.bookingReference,
        price: dto.price,
        currency: dto.currency,
        platform: dto.platform,
        notes: dto.notes,
      },
    });

    this.gateway.emitToDoctorRoom(
      existing.trip.doctorProfileId,
      'hotel.updated',
      { data: updated, actorId: actorUserId },
    );

    await this.notificationsService.notifyMembers(
      existing.trip.doctorProfileId,
      actorUserId,
      'Booking Hotel Diperbarui',
      `Booking hotel "${updated.name}" telah diperbarui.`,
      'hotel',
      updated.id,
    );

    return updated;
  }

  async softDelete(id: string, actorUserId: string) {
    const existing = await this.prisma.hotel.findFirst({
      where: { id, deletedAt: null },
      include: { trip: { select: { doctorProfileId: true, title: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Hotel ${id} not found`);
    }

    await this.prisma.hotel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.gateway.emitToDoctorRoom(
      existing.trip.doctorProfileId,
      'hotel.deleted',
      {
        data: { id, tripId: existing.tripId },
        actorId: actorUserId,
      },
    );

    await this.notificationsService.notifyMembers(
      existing.trip.doctorProfileId,
      actorUserId,
      'Booking Hotel Dihapus',
      `Booking hotel "${existing.name}" pada Trip "${existing.trip.title}" telah dihapus.`,
      'hotel',
      id,
    );

    return { success: true };
  }
}
