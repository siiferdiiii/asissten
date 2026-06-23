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
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';
import { LogActivity } from '../../core/decorators/log-activity.decorator';
import { RequestWithUser } from '../../core/types/request.types';

@UseGuards(DoctorProfileGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async findAll(@Query() query: QueryTaskDto) {
    return this.tasksService.findAll(query);
  }

  @Post()
  @Roles('owner_assistant', 'assistant')
  @LogActivity('task')
  async create(
    @Body() dto: CreateTaskDto,
    @GetUser('id') userId: string,
  ) {
    return this.tasksService.create(dto, userId);
  }

  @Get(':id')
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner_assistant', 'assistant', 'doctor')
  @LogActivity('task')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @GetUser('id') userId: string,
    @Request() req: any,
  ) {
    const role = req.membership!.role;
    return this.tasksService.update(id, dto, userId, role, req.user.id);
  }

  @Delete(':id')
  @Roles('owner_assistant', 'assistant')
  @LogActivity('task')
  async softDelete(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.tasksService.softDelete(id, userId);
  }
}
