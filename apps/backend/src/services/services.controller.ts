import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

@Controller('services')
export class ServicesController {
  constructor(private svc: ServicesService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  findAll(@Query() query: QueryServiceDto, @Request() req) {
    return this.svc.findAll(query, req.user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateServiceDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: Partial<CreateServiceDto>, @Request() req) {
    return this.svc.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(@Param('id') id: string, @Request() req) {
    return this.svc.toggleLike(id, req.user.id);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(@Param('id') id: string, @Request() req) {
    return this.svc.toggleBookmark(id, req.user.id);
  }
}
