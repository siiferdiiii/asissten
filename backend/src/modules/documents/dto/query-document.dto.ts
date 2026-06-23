import { IsEnum, IsUUID } from 'class-validator';
import { DocumentEntityType } from '@prisma/client';

export class QueryDocumentDto {
  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @IsUUID()
  entityId: string;
}
