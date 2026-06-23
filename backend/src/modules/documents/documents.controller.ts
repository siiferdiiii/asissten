import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { DoctorProfileGuard } from '../../core/guards/doctor-profile.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { GetUser } from '../../core/decorators/get-user.decorator';

@UseGuards(DoctorProfileGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles('owner_assistant', 'assistant', 'doctor', 'viewer')
  async findAll(@Query() query: QueryDocumentDto) {
    return {
      data: await this.documentsService.findAll(query.entityType, query.entityId),
    };
  }

  @Post('presigned-url')
  @Roles('owner_assistant', 'assistant')
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return {
      data: await this.documentsService.getPresignedUrl(dto),
    };
  }

  @Post()
  @Roles('owner_assistant', 'assistant')
  async create(
    @Body() dto: CreateDocumentDto,
    @GetUser('id') userId: string,
  ) {
    return {
      data: await this.documentsService.create(dto, userId),
    };
  }

  @Delete(':id')
  @Roles('owner_assistant', 'assistant')
  async remove(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.documentsService.remove(id, userId);
  }
}
