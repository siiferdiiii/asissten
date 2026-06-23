import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AddPackingItemDto, UpdatePackingItemDto, LoadTemplateDto } from './dto/packing.dto';
import { MembershipRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getOrCreatePackingList(tripId: string) {
    const existing = await this.prisma.packingList.findUnique({
      where: { tripId },
      include: { items: { orderBy: { updatedAt: 'asc' } } },
    });
    if (existing) return existing;

    return this.prisma.packingList.create({
      data: { tripId },
      include: { items: { orderBy: { updatedAt: 'asc' } } },
    });
  }

  private async getDoctorProfileId(tripId: string): Promise<string> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: { doctorProfileId: true },
    });
    if (!trip) throw new NotFoundException(`Trip ${tripId} not found`);
    return trip.doctorProfileId;
  }

  private async calcProgress(packingListId: string) {
    const [total, packed] = await Promise.all([
      this.prisma.packingItem.count({ where: { packingListId } }),
      this.prisma.packingItem.count({ where: { packingListId, isPacked: true } }),
    ]);
    return { packed, total };
  }

  // ─── Public Operations ────────────────────────────────────────────────────

  async getPackingList(tripId: string) {
    return this.getOrCreatePackingList(tripId);
  }

  async addItem(tripId: string, dto: AddPackingItemDto, actorUserId: string) {
    const packingList = await this.getOrCreatePackingList(tripId);
    const doctorProfileId = await this.getDoctorProfileId(tripId);

    const item = await this.prisma.packingItem.create({
      data: {
        packingListId: packingList.id,
        itemName: dto.itemName,
        category: dto.category,
        qty: dto.qty ?? 1,
      },
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'packing_item.created', {
      data: { tripId, packingListId: packingList.id, item },
      actorId: actorUserId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      actorUserId,
      'Item Packing Baru',
      `Item "${item.itemName}" (${item.category}) telah ditambahkan ke checklist perjalanan.`,
      'trip',
      tripId,
    );

    return item;
  }

  async updateItem(
    id: string,
    dto: UpdatePackingItemDto,
    actorUserId: string,
    role: MembershipRole,
  ) {
    const item = await this.prisma.packingItem.findUnique({
      where: { id },
      include: { packingList: { include: { trip: { select: { doctorProfileId: true, id: true } } } } },
    });

    if (!item) throw new NotFoundException(`Packing item ${id} not found`);

    // DR can only update isPacked
    if (role === MembershipRole.doctor) {
      const restrictedFields = Object.keys(dto).filter((k) => k !== 'isPacked');
      if (restrictedFields.length > 0) {
        throw new ForbiddenException('Doctor role can only update the isPacked field');
      }
    }

    const updated = await this.prisma.packingItem.update({
      where: { id },
      data: {
        itemName: dto.itemName,
        category: dto.category,
        qty: dto.qty,
        isPacked: dto.isPacked,
      },
    });

    const tripId = item.packingList.trip.id;
    const doctorProfileId = item.packingList.trip.doctorProfileId;
    const progress = await this.calcProgress(item.packingListId);

    this.gateway.emitToDoctorRoom(doctorProfileId, 'packing_item.updated', {
      data: {
        tripId,
        packingListId: item.packingListId,
        item: updated,
        progress,
      },
      actorId: actorUserId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      actorUserId,
      'Item Packing Diperbarui',
      `Item packing "${updated.itemName}" ditandai sebagai ${updated.isPacked ? 'Packed' : 'Unpacked'}.`,
      'trip',
      tripId,
    );

    return updated;
  }

  async deleteItem(id: string, actorUserId: string) {
    const item = await this.prisma.packingItem.findUnique({
      where: { id },
      include: { packingList: { include: { trip: { select: { doctorProfileId: true, id: true } } } } },
    });

    if (!item) throw new NotFoundException(`Packing item ${id} not found`);

    await this.prisma.packingItem.delete({ where: { id } });

    const tripId = item.packingList.trip.id;
    const doctorProfileId = item.packingList.trip.doctorProfileId;

    this.gateway.emitToDoctorRoom(doctorProfileId, 'packing_item.deleted', {
      data: { id, packingListId: item.packingListId, tripId },
      actorId: actorUserId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      actorUserId,
      'Item Packing Dihapus',
      `Item packing "${item.itemName}" telah dihapus.`,
      'trip',
      tripId,
    );

    return { success: true };
  }

  async loadTemplate(tripId: string, dto: LoadTemplateDto, actorUserId: string) {
    const template = await this.prisma.packingTemplate.findUnique({
      where: { id: dto.templateId },
      include: { items: true },
    });
    if (!template) throw new NotFoundException(`Template ${dto.templateId} not found`);

    const packingList = await this.getOrCreatePackingList(tripId);
    const doctorProfileId = await this.getDoctorProfileId(tripId);

    // Snapshot copy — append only
    await this.prisma.packingItem.createMany({
      data: template.items.map((ti) => ({
        packingListId: packingList.id,
        itemName: ti.itemName,
        category: ti.category,
        qty: ti.defaultQty,
      })),
    });

    const updatedList = await this.prisma.packingList.findUnique({
      where: { id: packingList.id },
      include: { items: { orderBy: { updatedAt: 'asc' } } },
    });

    this.gateway.emitToDoctorRoom(doctorProfileId, 'packing_list.templateLoaded', {
      data: updatedList,
      actorId: actorUserId,
    });

    await this.notificationsService.notifyMembers(
      doctorProfileId,
      actorUserId,
      'Template Packing Dimuat',
      `Template checklist "${template.name}" telah dimuat untuk Trip.`,
      'trip',
      tripId,
    );

    return updatedList;
  }
}
