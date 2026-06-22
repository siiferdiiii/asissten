import { IsString, IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '@prisma/client';

export class UpdateTripDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  destinationCity?: string;

  @IsString()
  @IsOptional()
  destinationCountry?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;
}
