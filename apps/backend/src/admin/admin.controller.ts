import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
  ) {}

  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: ['id', 'email', 'nickname', 'role', 'isBlocked', 'createdAt'],
    });
  }

  @Patch('users/:id/block')
  async blockUser(@Param('id') id: string) {
    const user = await this.userRepo.findOneByOrFail({ id });
    user.isBlocked = !user.isBlocked;
    return this.userRepo.save(user);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.userRepo.delete(id);
  }

  @Get('services')
  getServices(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.serviceRepo.findAndCount({
      relations: ['user', 'category'],
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
  }

  @Patch('services/:id/hide')
  async hideService(@Param('id') id: string) {
    const s = await this.serviceRepo.findOneByOrFail({ id });
    s.isHidden = !s.isHidden;
    return this.serviceRepo.save(s);
  }

  @Delete('services/:id')
  deleteService(@Param('id') id: string) {
    return this.serviceRepo.delete(id);
  }
}
