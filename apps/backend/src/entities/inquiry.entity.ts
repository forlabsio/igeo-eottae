import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Service } from './service.entity';

export type InquiryStatus = 'pending' | 'accepted' | 'rejected';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  receiver: User;

  @Column()
  receiverId: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  service: Service;

  @Column()
  serviceId: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: InquiryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
