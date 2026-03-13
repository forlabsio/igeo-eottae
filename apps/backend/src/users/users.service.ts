import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import { Like } from '../entities/like.entity';
import { Bookmark } from '../entities/bookmark.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
    @InjectRepository(Like) private likeRepo: Repository<Like>,
    @InjectRepository(Bookmark) private bookmarkRepo: Repository<Bookmark>,
  ) {}

  async getMyServices(userId: string) {
    return this.serviceRepo.find({
      where: { userId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyLikes(userId: string) {
    const likes = await this.likeRepo.find({
      where: { userId },
      relations: ['service', 'service.category'],
      order: { createdAt: 'DESC' },
    });
    return likes.map((l) => l.service);
  }

  async getMyBookmarks(userId: string) {
    const bms = await this.bookmarkRepo.find({
      where: { userId },
      relations: ['service', 'service.category'],
      order: { createdAt: 'DESC' },
    });
    return bms.map((b) => b.service);
  }
}
