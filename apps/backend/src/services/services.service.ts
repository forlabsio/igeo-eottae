import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import { Like } from '../entities/like.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
    @InjectRepository(Like) private likeRepo: Repository<Like>,
    @InjectRepository(Bookmark) private bookmarkRepo: Repository<Bookmark>,
  ) {}

  async findAll(query: QueryServiceDto, userId?: string) {
    const { page = 1, limit = 12, sort = 'likes', category, search } = query;
    const qb = this.serviceRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'cat')
      .leftJoinAndSelect('s.user', 'u')
      .where('s.isHidden = false');

    if (category) qb.andWhere('cat.slug = :category', { category });
    if (search) qb.andWhere('(s.name ILIKE :q OR s.description ILIKE :q)', { q: `%${search}%` });

    if (sort === 'likes') qb.orderBy('s.likeCount', 'DESC');
    else if (sort === 'name') qb.orderBy('s.name', 'ASC');
    else qb.orderBy('s.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    let likedIds = new Set<string>();
    let bookmarkedIds = new Set<string>();
    if (userId && data.length > 0) {
      const ids = data.map((s) => s.id);
      const likes = await this.likeRepo.find({ where: ids.map((id) => ({ userId, serviceId: id })) });
      likedIds = new Set(likes.map((l) => l.serviceId));
      const bms = await this.bookmarkRepo.find({ where: ids.map((id) => ({ userId, serviceId: id })) });
      bookmarkedIds = new Set(bms.map((b) => b.serviceId));
    }

    return {
      data: data.map((s) => this.toDto(s, likedIds.has(s.id), bookmarkedIds.has(s.id))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const s = await this.serviceRepo.findOne({
      where: { id, isHidden: false },
      relations: ['user', 'category'],
    });
    if (!s) throw new NotFoundException('서비스를 찾을 수 없습니다.');
    const isLiked = userId ? !!(await this.likeRepo.findOneBy({ userId, serviceId: id })) : false;
    const isBookmarked = userId ? !!(await this.bookmarkRepo.findOneBy({ userId, serviceId: id })) : false;
    return this.toDto(s, isLiked, isBookmarked);
  }

  async create(dto: CreateServiceDto, userId: string) {
    const s = this.serviceRepo.create({ ...dto, userId });
    return this.serviceRepo.save(s);
  }

  async update(id: string, dto: Partial<CreateServiceDto>, userId: string, role: string) {
    const s = await this.serviceRepo.findOneBy({ id });
    if (!s) throw new NotFoundException();
    if (s.userId !== userId && role !== 'admin') throw new ForbiddenException();
    Object.assign(s, dto);
    return this.serviceRepo.save(s);
  }

  async remove(id: string, userId: string, role: string) {
    const s = await this.serviceRepo.findOneBy({ id });
    if (!s) throw new NotFoundException();
    if (s.userId !== userId && role !== 'admin') throw new ForbiddenException();
    await this.serviceRepo.remove(s);
  }

  async toggleLike(serviceId: string, userId: string) {
    const existing = await this.likeRepo.findOneBy({ userId, serviceId });
    if (existing) {
      await this.likeRepo.remove(existing);
      await this.serviceRepo.decrement({ id: serviceId }, 'likeCount', 1);
      return { liked: false };
    }
    await this.likeRepo.save(this.likeRepo.create({ userId, serviceId }));
    await this.serviceRepo.increment({ id: serviceId }, 'likeCount', 1);
    return { liked: true };
  }

  async toggleBookmark(serviceId: string, userId: string) {
    const existing = await this.bookmarkRepo.findOneBy({ userId, serviceId });
    if (existing) {
      await this.bookmarkRepo.remove(existing);
      return { bookmarked: false };
    }
    await this.bookmarkRepo.save(this.bookmarkRepo.create({ userId, serviceId }));
    return { bookmarked: true };
  }

  private toDto(s: Service, isLiked: boolean, isBookmarked: boolean) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      url: s.url,
      imageUrl: s.imageUrl,
      likeCount: s.likeCount,
      isHidden: s.isHidden,
      categoryId: s.categoryId,
      categoryName: s.category?.name,
      userId: s.userId,
      userNickname: s.user?.nickname,
      isLiked,
      isBookmarked,
      createdAt: s.createdAt,
    };
  }
}
