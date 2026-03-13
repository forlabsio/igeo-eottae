import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private tokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new BadRequestException('이미 사용 중인 이메일입니다.');

    const nickExists = await this.userRepo.findOneBy({ nickname: dto.nickname });
    if (nickExists) throw new BadRequestException('이미 사용 중인 닉네임입니다.');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password: hash });
    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    if (user.isBlocked) throw new UnauthorizedException('차단된 계정입니다.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const record = await this.tokenRepo.findOneBy({ token });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }
    const user = await this.userRepo.findOneBy({ id: record.userId });
    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    const accessToken = this.signAccess(user);
    return { accessToken };
  }

  async logout(token: string) {
    await this.tokenRepo.delete({ token });
  }

  private async generateTokens(user: User) {
    const accessToken = this.signAccess(user);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d') as any,
    });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.tokenRepo.save(
      this.tokenRepo.create({ userId: user.id, token: refreshToken, expiresAt }),
    );
    return { accessToken, refreshToken };
  }

  private signAccess(user: User) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
  }
}
