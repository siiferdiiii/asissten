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
  Req,
} from '@nestjs/common';
import { ScheduleEventsService } from './schedule-events.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dto/update-schedule-event.dto';
import { QueryScheduleEventDto } from './dto/query-schedule-event.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { LogActivity } from '../../core/decorators/log-activity.decorator';
import { MembershipRole } from '@prisma/client';
import { ActivityLogInterceptor } from '../../core/interceptors/activity-log.interceptor';
import { RequestWithUser } from '../../core/types/request.types';
import { Request } from 'express';

@Controller('schedule-events')
@UseGuards(DoctorProfileGuard, RolesGuard)
@UseInterceptors(ActivityLogInterceptor)
export class ScheduleEventsController {
  constructor(private readonly scheduleEventsService: ScheduleEventsService) {}

  @Get()
  @Roles(
    MembershipRole.owner_assistant,
    MembershipRole.assistant,
    MembershipRole.doctor,
    MembershipRole.viewer,
  )
  async findAll(@Query() query: QueryScheduleEventDto) {
    return this.scheduleEventsService.findAll(query);
  }

  @Post()
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('schedule_event')
  async create(
    @Body() dto: CreateScheduleEventDto,
    @GetUser('id') userId: string,
  ) {
    return this.scheduleEventsService.create(dto, userId);
  }

  @Get(':eventId')
  @Roles(
    MembershipRole.owner_assistant,
    MembershipRole.assistant,
    MembershipRole.doctor,
    MembershipRole.viewer,
  )
  async findOne(
    @Param('eventId') eventId: string,
    @Query('doctorProfileId') doctorProfileId: string,
  ) {
    const data = await this.scheduleEventsService.findOne(eventId, doctorProfileId);
    return { data };
  }

  @Patch(':eventId')
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('schedule_event')
  async update(
    @Param('eventId') eventId: string,
    @Query('doctorProfileId') doctorProfileId: string,
    @Body() dto: UpdateScheduleEventDto,
    @GetUser('id') userId: string,
  ) {
    return this.scheduleEventsService.update(eventId, dto, doctorProfileId, userId);
  }

  @Delete(':eventId')
  @Roles(MembershipRole.owner_assistant, MembershipRole.assistant)
  @LogActivity('schedule_event')
  async remove(
    @Param('eventId') eventId: string,
    @Query('doctorProfileId') doctorProfileId: string,
    @GetUser('id') userId: string,
    @Query('scope') scope: 'this' | 'this_and_following' = 'this',
  ) {
    return this.scheduleEventsService.softDelete(eventId, doctorProfileId, scope, userId);
  }

  @Post(':eventId/confirm')
  @Roles(
    MembershipRole.owner_assistant,
    MembershipRole.assistant,
    MembershipRole.doctor,
  )
  async confirm(
    @Param('eventId') eventId: string,
    @Query('doctorProfileId') doctorProfileId: string,
    @GetUser('id') userId: string,
    @Req() req: any,
  ) {
    const role = (req as RequestWithUser).membership?.role;
    const data = await this.scheduleEventsService.confirm(eventId, doctorProfileId, role!, userId);
    return { data };
  }
}
