import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PackingService } from './packing.service';
import { AddPackingItemDto, UpdatePackingItemDto, LoadTemplateDto } from './dto/packing.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { LogActivity } from '../../core/decorators/log-activity.decorator';
import { RequestWithUser } from '../../core/types/request.types';

@UseGuards(DoctorProfileGuard, RolesGuard)
@Controller()
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  // GET /trips/:tripId/packing-list  (create-on-read)
  @Get('trips/:tripId/packing-list')
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async getPackingList(@Param('tripId') tripId: string) {
    return this.packingService.getPackingList(tripId);
  }

  // POST /trips/:tripId/packing-list/load-template
  @Post('trips/:tripId/packing-list/load-template')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('packing_list')
  async loadTemplate(
    @Param('tripId') tripId: string,
    @Body() dto: LoadTemplateDto,
    @GetUser('id') userId: string,
  ) {
    return this.packingService.loadTemplate(tripId, dto, userId);
  }

  // POST /trips/:tripId/packing-list/items
  @Post('trips/:tripId/packing-list/items')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('packing_item')
  async addItem(
    @Param('tripId') tripId: string,
    @Body() dto: AddPackingItemDto,
    @GetUser('id') userId: string,
  ) {
    return this.packingService.addItem(tripId, dto, userId);
  }

  // PATCH /packing-items/:id
  @Patch('packing-items/:id')
  @Roles('owner_assistant', 'assistant', 'doctor')
  @LogActivity('packing_item')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdatePackingItemDto,
    @GetUser('id') userId: string,
    @Request() req: any,
  ) {
    const role = req.membership!.role;
    return this.packingService.updateItem(id, dto, userId, role);
  }

  // DELETE /packing-items/:id
  @Delete('packing-items/:id')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('packing_item')
  async deleteItem(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.packingService.deleteItem(id, userId);
  }
}
