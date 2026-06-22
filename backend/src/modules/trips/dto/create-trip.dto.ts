import { IsString, IsNotEmpty, IsUUID, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  destinationCity: string;

  @IsString()
  @IsNotEmpty()
  destinationCountry: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @IsString()
  @IsOptional()
  purpose?: string;
}
