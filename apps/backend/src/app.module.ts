import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { Service } from './entities/service.entity';
import { Like } from './entities/like.entity';
import { Bookmark } from './entities/bookmark.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';

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
    AuthModule,
    ServicesModule,
  ],
})
export class AppModule {}
