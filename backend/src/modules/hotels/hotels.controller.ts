import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { LogActivity } from '../../core/decorators/log-activity.decorator';

@UseGuards(DoctorProfileGuard, RolesGuard)
@Controller()
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  // GET /trips/:tripId/hotels
  @Get('trips/:tripId/hotels')
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async findAllByTrip(
    @Param('tripId') tripId: string,
    @Query('doctorProfileId') doctorProfileId: string,
  ) {
    return this.hotelsService.findAllByTrip(tripId, doctorProfileId);
  }

  // POST /trips/:tripId/hotels
  @Post('trips/:tripId/hotels')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('hotel')
  async create(
    @Param('tripId') tripId: string,
    @Body() dto: CreateHotelDto,
    @GetUser('id') userId: string,
  ) {
    return this.hotelsService.create(tripId, dto, userId);
  }

  // GET /hotels/:id
  @Get('hotels/:id')
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async findOne(@Param('id') id: string) {
    return this.hotelsService.findOne(id);
  }

  // PATCH /hotels/:id
  @Patch('hotels/:id')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('hotel')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @GetUser('id') userId: string,
  ) {
    return this.hotelsService.update(id, dto, userId);
  }

  // DELETE /hotels/:id
  @Delete('hotels/:id')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('hotel')
  async softDelete(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.hotelsService.softDelete(id, userId);
  }
}
