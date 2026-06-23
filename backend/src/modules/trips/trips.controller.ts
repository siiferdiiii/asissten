import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { LogActivity } from '../../core/decorators/log-activity.decorator';
import { MembershipRole } from '@prisma/client';
import { ActivityLogInterceptor } from '../../core/interceptors/activity-log.interceptor';

@Controller('trips')
@UseGuards(DoctorProfileGuard, RolesGuard)
@UseInterceptors(ActivityLogInterceptor)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @Roles(
    MembershipRole.owner_assistant,
    MembershipRole.assistant,
    MembershipRole.doctor,
    MembershipRole.viewer,
  )
  async findAll(@Query() query: QueryTripDto) {
    return this.tripsService.findAll(query);
  }

  @Post()
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('trip')
  async create(@Body() dto: CreateTripDto, @GetUser('id') userId: string) {
    const data = await this.tripsService.create(dto, userId);
    return { data };
  }

  @Get(':tripId')
  @Roles(
    MembershipRole.owner_assistant,
    MembershipRole.assistant,
    MembershipRole.doctor,
    MembershipRole.viewer,
  )
  async findOne(
    @Param('tripId') tripId: string,
    @Query('doctorProfileId') doctorProfileId: string,
  ) {
    const data = await this.tripsService.findOne(tripId, doctorProfileId);
    return { data };
  }

  @Patch(':tripId')
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('trip')
  async update(
    @Param('tripId') tripId: string,
    @Query('doctorProfileId') doctorProfileId: string,
    @Body() dto: UpdateTripDto,
    @GetUser('id') userId: string,
  ) {
    const data = await this.tripsService.update(tripId, dto, doctorProfileId, userId);
    return { data };
  }

  @Delete(':tripId')
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('trip')
  async remove(
    @Param('tripId') tripId: string,
    @Query('doctorProfileId') doctorProfileId: string,
    @GetUser('id') userId: string,
  ) {
    return this.tripsService.softDelete(tripId, doctorProfileId, userId);
  }
}
