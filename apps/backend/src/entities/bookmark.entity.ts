import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';

@Entity('bookmarks')
@Unique(['userId', 'serviceId'])
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.bookmarks, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Service, (s) => s.bookmarks, { onDelete: 'CASCADE' })
  service: Service;

  @Column()
  serviceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
