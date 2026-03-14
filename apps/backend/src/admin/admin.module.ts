import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Service } from '../entities/service.entity';
import { Like } from '../entities/like.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Service, Like, Inquiry])],
  controllers: [AdminController],
})
export class AdminModule {}
