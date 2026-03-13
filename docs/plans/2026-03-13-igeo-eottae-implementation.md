# 이거 어때 — MVP 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 한국 메이커들이 서비스를 등록하고 좋아요를 주고받는 Product Hunt 스타일 플랫폼 MVP 구축

**Architecture:** pnpm monorepo (apps/frontend + apps/backend + packages/shared). NestJS REST API + Next.js 14 App Router. JWT access(15분) + refresh(7일) 인증. PostgreSQL + TypeORM.

**Tech Stack:** Next.js 14, NestJS, TypeORM, PostgreSQL, TailwindCSS, Cloudinary, Railway, pnpm workspaces

**Worktree:** `/Users/peterchae/.worktrees/igeo-eottae`
**Branch:** `feature/igeo-eottae`

---

## Task 1: Monorepo 초기 셋업

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: pnpm 설치 확인**

```bash
pnpm --version
# 없으면: npm install -g pnpm
```

**Step 2: 루트 package.json 생성**

```bash
cd /Users/peterchae/.worktrees/igeo-eottae
cat > package.json << 'EOF'
{
  "name": "igeo-eottae",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend start:dev",
    "build:frontend": "pnpm --filter frontend build",
    "build:backend": "pnpm --filter backend build"
  }
}
EOF
```

**Step 3: pnpm workspace 설정**

```bash
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF
```

**Step 4: 공통 tsconfig 생성**

```bash
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF
```

**Step 5: .gitignore 생성**

```bash
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
dist/
build/
.next/
*.log
.DS_Store
EOF
```

**Step 6: .env.example 생성**

```bash
cat > .env.example << 'EOF'
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/igeo_eottae
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF
```

**Step 7: 커밋**

```bash
git add .
git commit -m "chore: monorepo 초기 셋업 (pnpm workspaces)"
```

---

## Task 2: Shared 타입 패키지

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/service.ts`
- Create: `packages/shared/src/types/auth.ts`

**Step 1: 디렉토리 생성**

```bash
mkdir -p packages/shared/src/types
```

**Step 2: shared package.json**

```bash
cat > packages/shared/package.json << 'EOF'
{
  "name": "@igeo/shared",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
EOF
```

**Step 3: 타입 정의 — auth.ts**

```typescript
// packages/shared/src/types/auth.ts
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  nickname: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: 'user' | 'admin';
}
```

**Step 4: 타입 정의 — user.ts**

```typescript
// packages/shared/src/types/user.ts
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
}
```

**Step 5: 타입 정의 — service.ts**

```typescript
// packages/shared/src/types/service.ts
export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  likeCount: number;
  isHidden: boolean;
  categoryId?: string;
  categoryName?: string;
  userId: string;
  userNickname: string;
  isLiked?: boolean;      // 현재 유저 기준
  isBookmarked?: boolean; // 현재 유저 기준
  createdAt: string;
}

export interface ServiceListQuery {
  page?: number;
  limit?: number;
  sort?: 'likes' | 'latest';
  category?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Step 6: index.ts 배럴 익스포트**

```typescript
// packages/shared/src/index.ts
export * from './types/auth';
export * from './types/user';
export * from './types/service';
```

**Step 7: 커밋**

```bash
git add packages/shared/
git commit -m "feat: shared TypeScript 타입 패키지 추가"
```

---

## Task 3: NestJS 백엔드 초기화

**Files:**
- Create: `apps/backend/` (NestJS CLI로 생성)
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/tsconfig.json`
- Create: `apps/backend/.env`

**Step 1: NestJS 프로젝트 생성**

```bash
cd /Users/peterchae/.worktrees/igeo-eottae/apps
npx @nestjs/cli new backend --package-manager pnpm --skip-git
cd backend
```

**Step 2: 의존성 설치**

```bash
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport \
  @nestjs/typeorm typeorm pg \
  passport passport-jwt passport-local \
  bcrypt class-validator class-transformer \
  @nestjs/swagger swagger-ui-express \
  helmet @nestjs/serve-static \
  cloudinary multer @types/multer

pnpm add -D @types/bcrypt @types/passport-jwt @types/passport-local
```

**Step 3: apps/backend/package.json name 수정**

`"name"` 필드를 `"backend"`로 변경

**Step 4: .env 파일 생성 (로컬 개발용)**

```bash
cp ../../.env.example .env
# 실제 값으로 채움
```

**Step 5: 앱 실행 테스트**

```bash
pnpm start:dev
# Expected: Nest application successfully started on port 4000
```

**Step 6: 커밋**

```bash
cd ../..
git add apps/backend/
git commit -m "chore: NestJS 백엔드 초기 셋업"
```

---

## Task 4: TypeORM 엔티티 + 마이그레이션

**Files:**
- Create: `apps/backend/src/entities/user.entity.ts`
- Create: `apps/backend/src/entities/category.entity.ts`
- Create: `apps/backend/src/entities/service.entity.ts`
- Create: `apps/backend/src/entities/like.entity.ts`
- Create: `apps/backend/src/entities/bookmark.entity.ts`
- Create: `apps/backend/src/entities/refresh-token.entity.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: User 엔티티**

```typescript
// apps/backend/src/entities/user.entity.ts
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Service } from './service.entity';
import { Like } from './like.entity';
import { Bookmark } from './bookmark.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true, length: 50 })
  nickname: string;

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @Column({ default: false })
  isBlocked: boolean;

  @OneToMany(() => Service, (s) => s.user)
  services: Service[];

  @OneToMany(() => Like, (l) => l.user)
  likes: Like[];

  @OneToMany(() => Bookmark, (b) => b.user)
  bookmarks: Bookmark[];

  @OneToMany(() => RefreshToken, (r) => r.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 2: Category 엔티티**

```typescript
// apps/backend/src/entities/category.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from './service.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ unique: true, length: 50 })
  slug: string;

  @OneToMany(() => Service, (s) => s.category)
  services: Service[];
}
```

**Step 3: Service 엔티티**

```typescript
// apps/backend/src/entities/service.entity.ts
import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Like } from './like.entity';
import { Bookmark } from './bookmark.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.services, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Category, (c) => c.services, { nullable: true })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 500, nullable: true })
  imageUrl: string;

  @Index()
  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: false })
  isHidden: boolean;

  @OneToMany(() => Like, (l) => l.service)
  likes: Like[];

  @OneToMany(() => Bookmark, (b) => b.service)
  bookmarks: Bookmark[];

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 4: Like / Bookmark / RefreshToken 엔티티**

```typescript
// apps/backend/src/entities/like.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';

@Entity('likes')
@Unique(['userId', 'serviceId'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.likes, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Service, (s) => s.likes, { onDelete: 'CASCADE' })
  service: Service;

  @Column()
  serviceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// apps/backend/src/entities/bookmark.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';

@Entity('bookmarks')
@Unique(['userId', 'serviceId'])
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  service: Service;

  @Column()
  serviceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// apps/backend/src/entities/refresh-token.entity.ts
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ unique: true, length: 500 })
  token: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Step 5: AppModule에 TypeORM 연결**

```typescript
// apps/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Service } from './entities/service.entity';
import { Like } from './entities/like.entity';
import { Bookmark } from './entities/bookmark.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [User, Category, Service, Like, Bookmark, RefreshToken],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

**Step 6: 카테고리 시드 데이터 생성**

```typescript
// apps/backend/src/database/seeds/categories.seed.ts
import { DataSource } from 'typeorm';
import { Category } from '../../entities/category.entity';

export async function seedCategories(dataSource: DataSource) {
  const repo = dataSource.getRepository(Category);
  const categories = [
    { name: 'AI/ML', slug: 'ai-ml' },
    { name: 'SaaS', slug: 'saas' },
    { name: '개발툴', slug: 'devtools' },
    { name: '핀테크', slug: 'fintech' },
    { name: '마케팅', slug: 'marketing' },
    { name: '커머스', slug: 'commerce' },
    { name: '기타', slug: 'etc' },
  ];
  for (const cat of categories) {
    const exists = await repo.findOneBy({ slug: cat.slug });
    if (!exists) await repo.save(repo.create(cat));
  }
}
```

**Step 7: 앱 실행 + DB 연결 확인**

```bash
pnpm start:dev
# Expected: TypeORM 테이블 자동 생성 로그 확인
```

**Step 8: 커밋**

```bash
git add apps/backend/src/entities/ apps/backend/src/
git commit -m "feat: TypeORM 엔티티 5종 정의 (User, Category, Service, Like, Bookmark)"
```

---

## Task 5: Auth 모듈 (회원가입 / 로그인 / 토큰)

**Files:**
- Create: `apps/backend/src/auth/auth.module.ts`
- Create: `apps/backend/src/auth/auth.service.ts`
- Create: `apps/backend/src/auth/auth.controller.ts`
- Create: `apps/backend/src/auth/dto/register.dto.ts`
- Create: `apps/backend/src/auth/dto/login.dto.ts`
- Create: `apps/backend/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/backend/src/auth/guards/roles.guard.ts`
- Create: `apps/backend/src/auth/decorators/roles.decorator.ts`

**Step 1: DTO 정의**

```typescript
// apps/backend/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname: string;
}
```

```typescript
// apps/backend/src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

**Step 2: JWT Strategy**

```typescript
// apps/backend/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@igeo/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

**Step 3: Guards + Decorators**

```typescript
// apps/backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// apps/backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// apps/backend/src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return roles.includes(user?.role);
  }
}
```

**Step 4: AuthService**

```typescript
// apps/backend/src/auth/auth.service.ts
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
    const accessToken = this.signAccess(user);
    return { accessToken };
  }

  async logout(token: string) {
    await this.tokenRepo.delete({ token });
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.signAccess(user);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
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
```

**Step 5: AuthController**

```typescript
// apps/backend/src/auth/auth.controller.ts
import { Body, Controller, Post, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refresh(token);
  }

  @Post('logout')
  logout(@Body('refreshToken') token: string) {
    return this.authService.logout(token);
  }
}
```

**Step 6: AuthModule**

```typescript
// apps/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtStrategy],
})
export class AuthModule {}
```

**Step 7: AppModule에 AuthModule 추가**

`app.module.ts`의 imports 배열에 `AuthModule` 추가

**Step 8: API 수동 테스트**

```bash
# 회원가입
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","nickname":"tester"}'
# Expected: { accessToken: "...", refreshToken: "..." }

# 로그인
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# Expected: { accessToken: "...", refreshToken: "..." }
```

**Step 9: 커밋**

```bash
git add apps/backend/src/auth/
git commit -m "feat: Auth 모듈 (회원가입/로그인/JWT/refresh token)"
```

---

## Task 6: Services CRUD + Like/Bookmark 모듈

**Files:**
- Create: `apps/backend/src/services/services.module.ts`
- Create: `apps/backend/src/services/services.service.ts`
- Create: `apps/backend/src/services/services.controller.ts`
- Create: `apps/backend/src/services/dto/create-service.dto.ts`
- Create: `apps/backend/src/services/dto/query-service.dto.ts`

**Step 1: DTO 정의**

```typescript
// apps/backend/src/services/dto/create-service.dto.ts
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
```

```typescript
// apps/backend/src/services/dto/query-service.dto.ts
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryServiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 12;

  @IsOptional()
  @IsIn(['likes', 'latest'])
  sort?: 'likes' | 'latest' = 'likes';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
```

**Step 2: ServicesService**

```typescript
// apps/backend/src/services/services.service.ts
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

    qb.orderBy(sort === 'likes' ? 's.likeCount' : 's.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // 현재 유저 좋아요/관심 상태 조회
    let likedIds = new Set<string>();
    let bookmarkedIds = new Set<string>();
    if (userId) {
      const ids = data.map((s) => s.id);
      if (ids.length > 0) {
        const likes = await this.likeRepo.find({ where: ids.map((id) => ({ userId, serviceId: id })) });
        likedIds = new Set(likes.map((l) => l.serviceId));
        const bms = await this.bookmarkRepo.find({ where: ids.map((id) => ({ userId, serviceId: id })) });
        bookmarkedIds = new Set(bms.map((b) => b.serviceId));
      }
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
```

**Step 3: ServicesController**

```typescript
// apps/backend/src/services/services.controller.ts
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
```

> **Note:** `OptionalJwtGuard`는 토큰이 없어도 통과시키는 커스텀 가드. JWT 있으면 user 세팅, 없으면 null.

```typescript
// apps/backend/src/auth/guards/optional-jwt.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest(_err, user) {
    return user ?? null;
  }
}
```

**Step 4: ServicesModule 등록 + AppModule 추가**

```typescript
// apps/backend/src/services/services.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../entities/service.entity';
import { Like } from '../entities/like.entity';
import { Bookmark } from '../entities/bookmark.entity';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Like, Bookmark])],
  providers: [ServicesService],
  controllers: [ServicesController],
})
export class ServicesModule {}
```

**Step 5: API 수동 테스트**

```bash
# 서비스 등록
curl -X POST http://localhost:4000/services \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"AI Test","description":"테스트 서비스입니다 길게","url":"https://test.com","categoryId":"<catId>"}'

# 서비스 목록
curl "http://localhost:4000/services?sort=latest&page=1&limit=5"

# 좋아요 토글
curl -X POST http://localhost:4000/services/<id>/like \
  -H "Authorization: Bearer <accessToken>"
```

**Step 6: 커밋**

```bash
git add apps/backend/src/services/ apps/backend/src/auth/guards/
git commit -m "feat: Services CRUD + Like/Bookmark 토글 API"
```

---

## Task 7: Admin + Users API

**Files:**
- Create: `apps/backend/src/admin/admin.module.ts`
- Create: `apps/backend/src/admin/admin.controller.ts`
- Create: `apps/backend/src/users/users.module.ts`
- Create: `apps/backend/src/users/users.controller.ts`
- Create: `apps/backend/src/users/users.service.ts`

**Step 1: UsersService (마이페이지용)**

```typescript
// apps/backend/src/users/users.service.ts
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
```

**Step 2: AdminController (관리자 전용)**

```typescript
// apps/backend/src/admin/admin.controller.ts
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
      skip: (page - 1) * limit,
      take: limit,
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
      skip: (page - 1) * limit,
      take: limit,
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
```

**Step 3: 커밋**

```bash
git add apps/backend/src/admin/ apps/backend/src/users/
git commit -m "feat: Admin API (회원/서비스 관리) + Users 마이페이지 API"
```

---

## Task 8: NestJS 보안 설정 (Helmet, CORS, Validation)

**Files:**
- Modify: `apps/backend/src/main.ts`

**Step 1: main.ts 전체 교체**

```typescript
// apps/backend/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 보안 헤더
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // 전역 접두사
  app.setGlobalPrefix('api');

  // 전역 유효성 검사
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 4000);
  console.log(`Backend running on port ${process.env.PORT || 4000}`);
}
bootstrap();
```

**Step 2: 재시작 + 테스트**

```bash
pnpm start:dev
# Expected: Backend running on port 4000
```

**Step 3: 커밋**

```bash
git add apps/backend/src/main.ts
git commit -m "feat: Helmet + CORS + ValidationPipe 전역 설정"
```

---

## Task 9: Next.js 프론트엔드 초기화

**Files:**
- Create: `apps/frontend/` (Next.js CLI)
- Create: `apps/frontend/lib/api.ts`
- Create: `apps/frontend/lib/auth.ts`
- Create: `apps/frontend/contexts/AuthContext.tsx`
- Create: `apps/frontend/components/Navbar.tsx`

**Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/peterchae/.worktrees/igeo-eottae/apps
npx create-next-app@latest frontend \
  --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd frontend
pnpm add swr axios
```

**Step 2: tailwind.config 컬러 커스텀**

```typescript
// apps/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F2F2F0',
        card: '#FFFFFF',
        'accent-green': '#ADFA1D',
        'text-primary': '#1A1A1A',
        'text-secondary': '#737373',
        border: '#E8E8E8',
        danger: '#EF4444',
      },
    },
  },
};
export default config;
```

**Step 3: API 클라이언트**

```typescript
// apps/frontend/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(err.config);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;
```

**Step 4: AuthContext**

```typescript
// apps/frontend/contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface User { id: string; email: string; nickname: string; role: string; }
interface AuthCtx { user: User | null; loading: boolean; logout: () => void; setUser: (u: User | null) => void; }

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/users/me').then(({ data }) => setUser(data)).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/';
  };

  return <AuthContext.Provider value={{ user, loading, logout, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

**Step 5: 루트 layout.tsx에 AuthProvider 적용**

```typescript
// apps/frontend/app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-bg min-h-screen">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 6: Navbar 컴포넌트**

```typescript
// apps/frontend/components/Navbar.tsx
'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-border h-[60px] flex items-center justify-between px-12">
      <Link href="/" className="text-lg font-bold text-black">이거 어때</Link>
      <div className="flex items-center gap-8">
        <Link href="/" className="text-sm font-semibold text-black">홈</Link>
        <Link href="/services" className="text-sm text-text-secondary">서비스 탐색</Link>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link href="/mypage" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center text-xs font-bold">
                {user.nickname[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">{user.nickname}</span>
            </Link>
            <button onClick={logout} className="text-sm text-text-secondary">로그아웃</button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm border border-border px-4 py-2 rounded">로그인</Link>
            <Link href="/register" className="text-sm bg-black text-white px-4 py-2 rounded">회원가입</Link>
          </>
        )}
      </div>
    </nav>
  );
}
```

**Step 7: 실행 테스트**

```bash
pnpm dev
# Expected: http://localhost:3000 접속 → Navbar 렌더링 확인
```

**Step 8: 커밋**

```bash
git add apps/frontend/
git commit -m "feat: Next.js 프론트엔드 초기화 (Navbar, AuthContext, API 클라이언트)"
```

---

## Task 10: 퍼블릭 페이지 구현 (홈 / 서비스 목록 / 상세)

**Files:**
- Create: `apps/frontend/app/page.tsx`
- Create: `apps/frontend/app/services/page.tsx`
- Create: `apps/frontend/app/services/[id]/page.tsx`
- Create: `apps/frontend/components/ServiceCard.tsx`
- Create: `apps/frontend/components/LikeButton.tsx`

**Step 1: ServiceCard 컴포넌트**

```typescript
// apps/frontend/components/ServiceCard.tsx
import Link from 'next/link';
import LikeButton from './LikeButton';
import { ServiceItem } from '@igeo/shared';

export default function ServiceCard({ service }: { service: ServiceItem }) {
  return (
    <div className="bg-white border border-border rounded-lg flex items-center h-[100px] overflow-hidden">
      <LikeButton serviceId={service.id} count={service.likeCount} isLiked={service.isLiked} />
      <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xl mx-4 bg-accent-green font-bold flex-shrink-0">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          service.name[0]
        )}
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <Link href={`/services/${service.id}`} className="font-semibold text-text-primary text-[15px] hover:underline">
          {service.name}
        </Link>
        <p className="text-sm text-text-secondary truncate mt-1">{service.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {service.categoryName && (
            <span className="text-xs bg-bg text-text-secondary px-2 py-0.5 rounded">{service.categoryName}</span>
          )}
          <span className="text-xs text-text-secondary/60">by @{service.userNickname}</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: LikeButton 컴포넌트**

```typescript
// apps/frontend/components/LikeButton.tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';

interface Props { serviceId: string; count: number; isLiked?: boolean; size?: 'sm' | 'lg'; }

export default function LikeButton({ serviceId, count: initialCount, isLiked: initialLiked, size = 'sm' }: Props) {
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount);

  const toggle = async () => {
    try {
      const { data } = await api.post(`/services/${serviceId}/like`);
      setLiked(data.liked);
      setCount((c) => data.liked ? c + 1 : c - 1);
    } catch {
      window.location.href = '/login';
    }
  };

  const base = size === 'lg'
    ? 'flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-lg cursor-pointer'
    : 'flex flex-col items-center justify-center gap-1 w-[72px] h-full border-r border-border cursor-pointer';

  return (
    <button onClick={toggle} className={`${base} ${liked ? 'bg-accent-green' : 'bg-transparent hover:bg-bg'}`}>
      <span className={`text-sm font-bold ${liked ? 'text-black' : 'text-text-secondary'}`}>▲</span>
      <span className={`text-xs font-bold ${liked ? 'text-black' : 'text-text-secondary'}`}>{count}</span>
    </button>
  );
}
```

**Step 3: 홈 페이지**

```typescript
// apps/frontend/app/page.tsx
import Link from 'next/link';
import ServiceCard from '@/components/ServiceCard';
import { ServiceItem } from '@igeo/shared';

async function getTopServices(): Promise<ServiceItem[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?sort=likes&limit=6`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data;
}

export default async function HomePage() {
  const services = await getTopServices();

  return (
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-border py-16 flex flex-col items-center gap-4">
        <span className="bg-accent-green text-black text-xs font-semibold px-3 py-1 rounded-full">
          🚀 Korean Makers Platform
        </span>
        <h1 className="text-4xl font-bold text-text-primary">당신의 서비스를 세상에 알리세요</h1>
        <p className="text-text-secondary">직접 만든 서비스와 사업 아이디어를 등록하고, 커뮤니티의 피드백을 받아보세요.</p>
        <div className="flex gap-3 mt-2">
          <Link href="/services/new" className="bg-black text-white px-6 py-3 rounded text-sm font-semibold">
            서비스 등록하기
          </Link>
          <Link href="/services" className="border border-border text-text-primary px-6 py-3 rounded text-sm">
            서비스 탐색하기
          </Link>
        </div>
      </div>

      {/* 서비스 그리드 */}
      <div className="max-w-7xl mx-auto px-12 py-8">
        <div className="grid grid-cols-3 gap-4">
          {services.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
        <div className="text-center mt-8">
          <Link href="/services" className="text-sm border border-border px-6 py-3 rounded text-text-secondary hover:bg-bg">
            전체 서비스 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: 서비스 목록 페이지**

```typescript
// apps/frontend/app/services/page.tsx
'use client';
import { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import api from '@/lib/api';
import Link from 'next/link';

const CATEGORIES = ['전체', 'AI/ML', 'SaaS', '개발툴', '핀테크', '마케팅', '커머스', '기타'];
const CATEGORY_SLUGS: Record<string, string> = { 'AI/ML': 'ai-ml', 'SaaS': 'saas', '개발툴': 'devtools', '핀테크': 'fintech', '마케팅': 'marketing', '커머스': 'commerce', '기타': 'etc' };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'likes' | 'latest'>('likes');
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ sort, page: String(page), limit: '12' });
    if (category !== '전체') params.set('category', CATEGORY_SLUGS[category]);
    if (search) params.set('search', search);
    api.get(`/services?${params}`).then(({ data }) => { setServices(data.data); setTotal(data.total); });
  }, [sort, category, page, search]);

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-[220px] bg-white border-r border-border p-6 flex-shrink-0">
        <p className="text-xs font-semibold text-text-secondary mb-3">카테고리</p>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`w-full text-left px-3 py-2 rounded text-sm mb-1 ${category === cat ? 'bg-black text-white' : 'text-text-secondary hover:bg-bg'}`}>
            {cat}
          </button>
        ))}
      </aside>

      {/* 본문 */}
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-4">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="서비스 이름 또는 설명 검색..." className="border border-border rounded px-4 py-2 text-sm w-80 bg-bg" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">총 {total}개</span>
            <button onClick={() => setSort('likes')} className={`px-3 py-1.5 rounded text-sm ${sort === 'likes' ? 'bg-black text-white' : 'border border-border text-text-secondary'}`}>좋아요순</button>
            <button onClick={() => setSort('latest')} className={`px-3 py-1.5 rounded text-sm ${sort === 'latest' ? 'bg-black text-white' : 'border border-border text-text-secondary'}`}>최신순</button>
            <Link href="/services/new" className="bg-black text-white px-4 py-2 rounded text-sm font-semibold">+ 서비스 등록</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {services.map((s: any) => <ServiceCard key={s.id} service={s} />)}
        </div>
      </div>
    </div>
  );
}
```

**Step 5: 커밋**

```bash
git add apps/frontend/app/ apps/frontend/components/
git commit -m "feat: 홈/서비스목록 페이지 + ServiceCard/LikeButton 컴포넌트"
```

---

## Task 11: 인증 페이지 (로그인 / 회원가입)

**Files:**
- Create: `apps/frontend/app/login/page.tsx`
- Create: `apps/frontend/app/register/page.tsx`

**Step 1: 로그인 페이지**

```typescript
// apps/frontend/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const { data: me } = await api.get('/users/me');
      setUser(me);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-white border border-border rounded-xl p-10 w-[440px] flex flex-col gap-6">
        <div className="text-xl font-bold">이거 어때</div>
        <div>
          <h1 className="text-xl font-semibold">다시 만나서 반가워요 👋</h1>
          <p className="text-sm text-text-secondary mt-1">계정에 로그인하여 서비스를 탐색하세요.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">이메일</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="hello@example.com" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">비밀번호</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder="••••••••" required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="w-full bg-black text-white py-3.5 rounded text-sm font-semibold mt-2">로그인</button>
        </form>
        <p className="text-center text-sm text-text-secondary">
          계정이 없으신가요?{' '}
          <Link href="/register" className="font-semibold text-black">회원가입</Link>
        </p>
        <div className="bg-accent-green rounded px-4 py-3 text-sm font-medium text-black">
          🚀 한국 메이커들이 만든 서비스를 발견하세요!
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 회원가입 페이지**

```typescript
// apps/frontend/app/register/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const { data: me } = await api.get('/users/me');
      setUser(me);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="bg-white border border-border rounded-xl p-10 w-[440px] flex flex-col gap-5">
        <div className="text-xl font-bold">이거 어때</div>
        <div>
          <h1 className="text-xl font-semibold">새 계정 만들기</h1>
          <p className="text-sm text-text-secondary mt-1">서비스를 등록하고 커뮤니티와 공유하세요.</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {[
            { label: '닉네임', key: 'nickname', type: 'text', placeholder: 'maker_kim' },
            { label: '이메일', key: 'email', type: 'email', placeholder: 'hello@example.com' },
            { label: '비밀번호', key: 'password', type: 'password', placeholder: '8자 이상 입력하세요' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium mb-1.5 block">{label}</label>
              <input type={type} value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg"
                placeholder={placeholder} required />
            </div>
          ))}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="w-full bg-black text-white py-3.5 rounded text-sm font-semibold mt-2">회원가입</button>
        </form>
        <p className="text-center text-sm text-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-black">로그인</Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add apps/frontend/app/login/ apps/frontend/app/register/
git commit -m "feat: 로그인/회원가입 페이지 구현"
```

---

## Task 12: 마이페이지 + 서비스 등록 페이지

**Files:**
- Create: `apps/frontend/app/mypage/page.tsx`
- Create: `apps/frontend/app/services/new/page.tsx`
- Create: `apps/frontend/app/services/[id]/page.tsx`
- Create: `apps/frontend/middleware.ts`

**Step 1: 미들웨어 (인증 보호)**

```typescript
// apps/frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/mypage', '/services/new'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  if (PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/mypage/:path*', '/services/new'] };
```

> **Note:** localStorage는 미들웨어에서 접근 불가 → 쿠키로 토큰 저장 필요. `lib/api.ts`의 로그인 성공 시 `document.cookie = 'accessToken=...'`도 추가.

**Step 2: 서비스 등록 페이지**

```typescript
// apps/frontend/app/services/new/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const CATS = [
  { label: 'AI/ML', id: '' },  // 실제 id는 API에서 가져옴
  { label: 'SaaS', id: '' },
];

export default function NewServicePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', url: '', categoryId: '', imageUrl: '' });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/services', form);
      router.push(`/services/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message?.join(', ') || '등록에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg py-10 px-12">
      <h1 className="text-2xl font-bold mb-2">서비스 등록</h1>
      <p className="text-sm text-text-secondary mb-8">만든 서비스나 사업 아이디어를 커뮤니티에 공유하세요.</p>
      <div className="bg-white border border-border rounded-lg p-8 max-w-3xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          {[
            { label: '서비스 이름 *', key: 'name', placeholder: 'AI Meeting Summary' },
            { label: '서비스 링크 *', key: 'url', placeholder: 'https://' },
            { label: '대표 이미지 URL', key: 'imageUrl', placeholder: 'https://cloudinary...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-semibold mb-2 block">{label}</label>
              <input value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg" placeholder={placeholder}
                required={label.includes('*')} />
            </div>
          ))}
          <div>
            <label className="text-sm font-semibold mb-2 block">서비스 설명 *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-border rounded px-3.5 py-3 text-sm bg-bg h-28 resize-none"
              placeholder="서비스를 10자 이상 설명해 주세요." required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.back()} className="border border-border px-6 py-3 rounded text-sm text-text-secondary">취소</button>
            <button type="submit" className="bg-black text-white px-6 py-3 rounded text-sm font-semibold">서비스 등록하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add apps/frontend/app/mypage/ apps/frontend/app/services/new/ apps/frontend/middleware.ts
git commit -m "feat: 마이페이지 + 서비스 등록 페이지 구현"
```

---

## Task 13: Admin 페이지 구현

**Files:**
- Create: `apps/frontend/app/admin/page.tsx`
- Create: `apps/frontend/app/admin/users/page.tsx`
- Create: `apps/frontend/app/admin/services/page.tsx`
- Create: `apps/frontend/components/AdminSidebar.tsx`

**Step 1: AdminSidebar**

```typescript
// apps/frontend/components/AdminSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menus = [
  { label: '대시보드', href: '/admin' },
  { label: '회원 관리', href: '/admin/users' },
  { label: '서비스 관리', href: '/admin/services' },
];

export default function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-[220px] bg-white border-r border-border p-6 min-h-screen flex-shrink-0">
      <p className="text-xs font-semibold text-text-secondary mb-3">관리 메뉴</p>
      {menus.map((m) => (
        <Link key={m.href} href={m.href}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm mb-1 ${path === m.href ? 'bg-black text-white' : 'text-text-secondary hover:bg-bg'}`}>
          {m.label}
        </Link>
      ))}
    </aside>
  );
}
```

**Step 2: Admin 대시보드**

```typescript
// apps/frontend/app/admin/page.tsx
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';

export default async function AdminPage() {
  // SSR에서는 서버사이드 fetch 사용
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">대시보드</h1>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '총 회원수', value: '-' },
            { label: '등록 서비스', value: '-' },
            { label: '총 좋아요', value: '-' },
            { label: '차단 회원', value: '-' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-border rounded-lg p-6">
              <p className="text-xs text-text-secondary">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Admin Users 페이지**

```typescript
// apps/frontend/app/admin/users/page.tsx
'use client';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  const load = () => api.get('/admin/users').then(({ data }) => setUsers(data[0]));
  useEffect(() => { load(); }, []);

  const block = async (id: string) => { await api.patch(`/admin/users/${id}/block`); load(); };
  const del = async (id: string) => { if (confirm('삭제하시겠습니까?')) { await api.delete(`/admin/users/${id}`); load(); } };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">회원 관리</h1>
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg text-xs text-text-secondary font-semibold">
              <tr>
                {['닉네임', '이메일', '상태', '가입일', '작업'].map((h) => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-5 py-3.5 text-sm font-medium">{u.nickname}</td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${u.isBlocked ? 'bg-red-100 text-danger' : 'bg-accent-green text-black'}`}>
                      {u.isBlocked ? '차단' : '활성'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-secondary">{new Date(u.createdAt).toLocaleDateString('ko')}</td>
                  <td className="px-5 py-3.5 flex gap-2">
                    <button onClick={() => block(u.id)} className="border border-border text-xs px-2 py-1 rounded text-text-secondary">
                      {u.isBlocked ? '해제' : '차단'}
                    </button>
                    <button onClick={() => del(u.id)} className="bg-danger text-white text-xs px-2 py-1 rounded">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: 커밋**

```bash
git add apps/frontend/app/admin/ apps/frontend/components/AdminSidebar.tsx
git commit -m "feat: Admin 페이지 (대시보드/회원관리/서비스관리)"
```

---

## Task 14: Railway 배포 설정

**Files:**
- Create: `apps/backend/railway.json`
- Create: `apps/frontend/railway.json`
- Create: `railway.json`

**Step 1: Backend railway.json**

```json
// apps/backend/railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node dist/main",
    "healthcheckPath": "/api",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 2: Frontend railway.json**

```json
// apps/frontend/railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/"
  }
}
```

**Step 3: 환경변수 Railway에 설정**

Railway 대시보드에서 Backend 서비스에 아래 환경변수 설정:
```
DATABASE_URL         = (Railway PostgreSQL 자동 주입)
JWT_ACCESS_SECRET    = <32자 이상 랜덤 문자열>
JWT_REFRESH_SECRET   = <32자 이상 랜덤 문자열>
JWT_ACCESS_EXPIRES   = 15m
JWT_REFRESH_EXPIRES  = 7d
CLOUDINARY_CLOUD_NAME = ...
CLOUDINARY_API_KEY    = ...
CLOUDINARY_API_SECRET = ...
CORS_ORIGIN          = https://<frontend-railway-url>
NODE_ENV             = production
```

**Step 4: 배포**

```bash
# Railway CLI 사용
railway up --detach
```

**Step 5: 커밋**

```bash
git add apps/backend/railway.json apps/frontend/railway.json
git commit -m "chore: Railway 배포 설정 추가"
```

---

## Task 15: 최종 통합 테스트 + 브랜치 완료

**Step 1: E2E 시나리오 수동 테스트**

```
1. 회원가입 → 로그인 → 서비스 등록 → 목록에서 확인
2. 좋아요 클릭 → 카운트 증가 확인
3. 관심 등록 → 마이페이지에서 확인
4. 관리자 계정으로 서비스 숨김 → 목록에서 사라짐 확인
```

**Step 2: 관리자 계정 생성**

```sql
-- DB에 직접 실행
UPDATE users SET role = 'admin' WHERE email = 'admin@igeo.com';
```

**Step 3: 브랜치 완료 처리**

`superpowers:finishing-a-development-branch` 스킬 실행

**Step 4: PR 생성**

```bash
gh pr create \
  --title "feat: 이거 어때 MVP 전체 구현" \
  --body "## Summary
- NestJS 백엔드 (Auth, Services, Like/Bookmark, Admin)
- Next.js 14 프론트엔드 (10개 페이지)
- PostgreSQL + TypeORM 엔티티 5종
- Railway 배포 설정
- Cloudinary 이미지 업로드

## Test plan
- [ ] 회원가입/로그인/로그아웃 동작 확인
- [ ] 서비스 등록/수정/삭제 확인
- [ ] 좋아요 토글 (1인 1회) 확인
- [ ] 관심 등록 및 마이페이지 확인
- [ ] 관리자 권한 (차단/숨김/삭제) 확인
- [ ] Railway 배포 후 연동 확인"
```
