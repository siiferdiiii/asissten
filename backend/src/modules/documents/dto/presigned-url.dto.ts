import {
  IsString,
  IsIn,
  IsInt,
  Max,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { DocumentEntityType } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
];

export class PresignedUrlDto {
  @IsString()
  fileName: string;

  @IsIn(ALLOWED_MIME_TYPES, {
    message: 'File type must be one of: application/pdf, image/jpeg, image/png, image/heic',
  })
  fileType: string;

  @IsInt()
  @Max(10485760, { message: 'File size must not exceed 10 MB (10485760 bytes)' })
  fileSize: number;

  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @IsUUID()
  entityId: string;
}
