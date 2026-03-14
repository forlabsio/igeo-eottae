import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Service } from './entities/service.entity';
import { Like } from './entities/like.entity';
import { Bookmark } from './entities/bookmark.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';

const SEED_CATEGORIES = [
  { name: 'AI/ML', slug: 'ai-ml' },
  { name: 'SaaS', slug: 'saas' },
  { name: '개발툴', slug: 'devtools' },
  { name: '핀테크', slug: 'fintech' },
  { name: '마케팅', slug: 'marketing' },
  { name: '커머스', slug: 'commerce' },
  { name: '기타', slug: 'etc' },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [User, Category, Service, Like, Bookmark, RefreshToken],
        synchronize: config.get('NODE_ENV') !== 'production' || config.get('TYPEORM_SYNC') === 'true',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([Category]),
    AuthModule,
    ServicesModule,
    UsersModule,
    AdminModule,
    CategoriesModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.categoryRepo.count();
    if (count === 0) {
      await this.categoryRepo.save(SEED_CATEGORIES);
    }
  }
}
