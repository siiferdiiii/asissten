import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { DocumentEntityType } from '@prisma/client';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DocumentsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly accountId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gateway: RealtimeGateway,
  ) {
    this.accountId = this.config.getOrThrow<string>('CLOUDFLARE_R2_ACCOUNT_ID');
    this.bucketName = this.config.getOrThrow<string>('CLOUDFLARE_R2_BUCKET_NAME');

    this.s3Client = new S3Client({
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('CLOUDFLARE_R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
      },
      region: 'auto',
    });
  }

  private async getDoctorProfileId(entityType: DocumentEntityType, entityId: string): Promise<string> {
    if (entityType === DocumentEntityType.trip) {
      const trip = await this.prisma.trip.findFirst({
        where: { id: entityId, deletedAt: null },
      });
      if (!trip) throw new NotFoundException(`Trip ${entityId} not found`);
      return trip.doctorProfileId;
    } else if (entityType === DocumentEntityType.hotel) {
      const hotel = await this.prisma.hotel.findFirst({
        where: { id: entityId, deletedAt: null },
        include: { trip: true },
      });
      if (!hotel) throw new NotFoundException(`Hotel ${entityId} not found`);
      return hotel.trip.doctorProfileId;
    } else if (entityType === DocumentEntityType.task) {
      const task = await this.prisma.task.findFirst({
        where: { id: entityId, deletedAt: null },
      });
      if (!task) throw new NotFoundException(`Task ${entityId} not found`);
      return task.doctorProfileId;
    } else if (entityType === DocumentEntityType.schedule_event) {
      const event = await this.prisma.scheduleEvent.findFirst({
        where: { id: entityId, deletedAt: null },
      });
      if (!event) throw new NotFoundException(`Schedule event ${entityId} not found`);
      return event.doctorProfileId;
    }
    throw new BadRequestException('Invalid entity type');
  }

  async getPresignedUrl(dto: PresignedUrlDto) {
    const fileId = uuidv4();
    // Embed the file name in the path to preserve it
    const key = `documents/${dto.entityType}/${dto.entityId}/${fileId}/${dto.fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    return {
      uploadUrl,
      key,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async findAll(entityType: DocumentEntityType, entityId: string) {
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      include: {
        uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async create(dto: CreateDocumentDto, uploaderUserId: string) {
    const doctorProfileId = await this.getDoctorProfileId(dto.entityType, dto.entityId);

    // Formulate the fileUrl
    const fileUrl = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${dto.key}`;

    const document = await this.prisma.document.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        fileUrl,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        uploadedById: uploaderUserId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Emit realtime socket event
    this.gateway.emitToDoctorRoom(doctorProfileId, 'document.uploaded', {
      data: { ...document, key: dto.key, fileName: dto.fileName },
      actorId: uploaderUserId,
    });

    return document;
  }

  async remove(id: string, actorUserId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doctorProfileId = await this.getDoctorProfileId(document.entityType, document.entityId);

    // Extract S3 key from the fileUrl
    // fileUrl format: https://accountId.r2.cloudflarestorage.com/bucketName/key
    const urlPrefix = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/`;
    const key = document.fileUrl.replace(urlPrefix, '');

    // Delete from Cloudflare R2
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(deleteCommand);
    } catch (err) {
      // Log error but continue to clean up database
      console.error(`Failed to delete key ${key} from R2 bucket:`, err);
    }

    // Delete from database
    await this.prisma.document.delete({
      where: { id },
    });

    // Emit realtime socket event
    this.gateway.emitToDoctorRoom(doctorProfileId, 'document.deleted', {
      data: { id, entityType: document.entityType, entityId: document.entityId },
      actorId: actorUserId,
    });

    return { success: true };
  }
}
