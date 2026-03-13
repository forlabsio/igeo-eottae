import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../entities/service.entity';
import { Like } from '../entities/like.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Like, Bookmark])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
