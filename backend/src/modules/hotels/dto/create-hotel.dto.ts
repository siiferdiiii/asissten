import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsDecimal,
  Min,
} from 'class-validator';
import { HotelBookingStatus, HotelPlatform } from '@prisma/client';

export class CreateHotelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsEnum(HotelBookingStatus)
  bookingStatus: HotelBookingStatus;

  @IsOptional()
  @IsString()
  bookingReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(HotelPlatform)
  platform?: HotelPlatform;

  @IsOptional()
  @IsString()
  notes?: string;
}
