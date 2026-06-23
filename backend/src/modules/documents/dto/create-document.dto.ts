import {
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { DocumentEntityType } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  key: string;

  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @IsUUID()
  entityId: string;

  @IsString()
  fileName: string;

  @IsString()
  fileType: string;

  @IsInt()
  fileSize: number;
}
