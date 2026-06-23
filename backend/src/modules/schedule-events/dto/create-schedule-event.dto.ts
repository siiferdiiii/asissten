import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '@prisma/client';

export class CreateScheduleEventDto {
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId: string;

  @IsUUID()
  @IsOptional()
  tripId?: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  type: EventType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  location?: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDatetime: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDatetime: Date;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean = false;

  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
