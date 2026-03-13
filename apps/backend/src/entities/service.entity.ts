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
