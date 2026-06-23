import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, IsUUID, Min } from 'class-validator';
import { PackingCategory } from '@prisma/client';

export class AddPackingItemDto {
  @IsString()
  itemName: string;

  @IsEnum(PackingCategory)
  category: PackingCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;
}

export class UpdatePackingItemDto {
  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsEnum(PackingCategory)
  category?: PackingCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsBoolean()
  isPacked?: boolean;
}

export class LoadTemplateDto {
  @IsUUID()
  templateId: string;
}
