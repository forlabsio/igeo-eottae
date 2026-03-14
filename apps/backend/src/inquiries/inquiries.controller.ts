import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Controller('inquiries')
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private svc: InquiriesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateInquiryDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Get('received')
  received(@Request() req: any) {
    return this.svc.getReceived(req.user.id);
  }

  @Get('sent')
  sent(@Request() req: any) {
    return this.svc.getSent(req.user.id);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Request() req: any) {
    return this.svc.accept(id, req.user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req: any) {
    return this.svc.reject(id, req.user.id);
  }
}
