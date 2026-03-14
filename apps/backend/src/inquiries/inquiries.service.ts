import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Service } from '../entities/service.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry) private repo: Repository<Inquiry>,
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
  ) {}

  async create(senderId: string, dto: CreateInquiryDto) {
    const service = await this.serviceRepo.findOneBy({ id: dto.serviceId });
    if (!service) throw new NotFoundException('서비스를 찾을 수 없습니다.');
    if (service.userId === senderId) throw new BadRequestException('본인 서비스에는 문의할 수 없습니다.');

    const exists = await this.repo.findOneBy({ senderId, serviceId: dto.serviceId, status: 'pending' });
    if (exists) throw new BadRequestException('이미 대기 중인 문의가 있습니다.');

    const inquiry = this.repo.create({ senderId, receiverId: service.userId, serviceId: dto.serviceId, title: dto.title, message: dto.message });
    const saved = await this.repo.save(inquiry);
    return this.toDto(saved, senderId);
  }

  async getReceived(userId: string) {
    const rows = await this.repo.find({
      where: { receiverId: userId },
      relations: ['sender', 'service'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r, userId));
  }

  async getSent(userId: string) {
    const rows = await this.repo.find({
      where: { senderId: userId },
      relations: ['receiver', 'service'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r, userId));
  }

  async accept(id: string, userId: string) {
    const inquiry = await this.findAndCheckReceiver(id, userId);
    inquiry.status = 'accepted';
    const saved = await this.repo.save(inquiry);
    return this.toDto(saved, userId, true);
  }

  async reject(id: string, userId: string) {
    const inquiry = await this.findAndCheckReceiver(id, userId);
    inquiry.status = 'rejected';
    const saved = await this.repo.save(inquiry);
    return this.toDto(saved, userId);
  }

  private async findAndCheckReceiver(id: string, userId: string) {
    const inquiry = await this.repo.findOne({ where: { id }, relations: ['sender', 'receiver', 'service'] });
    if (!inquiry) throw new NotFoundException();
    if (inquiry.receiverId !== userId) throw new ForbiddenException();
    if (inquiry.status !== 'pending') throw new BadRequestException('이미 처리된 문의입니다.');
    return inquiry;
  }

  private toDto(inquiry: Inquiry, viewerId: string, forceReveal = false) {
    const accepted = inquiry.status === 'accepted' || forceReveal;
    return {
      id: inquiry.id,
      title: inquiry.title,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      service: inquiry.service ? { id: inquiry.service.id, name: inquiry.service.name } : null,
      senderNickname: inquiry.sender?.nickname,
      receiverNickname: inquiry.receiver?.nickname,
      // Reveal emails only after acceptance
      senderEmail: accepted ? inquiry.sender?.email : null,
      receiverEmail: accepted ? inquiry.receiver?.email : null,
    };
  }
}
