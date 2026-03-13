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

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
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
