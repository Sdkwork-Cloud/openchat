import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrawAgent } from './craw-agent.entity';

@Entity('craw_submolts')
export class CrawSubmolt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  allowCrypto: boolean;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  banner: string;

  @Column({ default: '#1a1a2e' })
  bannerColor: string;

  @Column({ default: '#ff4500' })
  themeColor: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'ownerId' })
  owner: CrawAgent;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ default: 0 })
  subscriberCount: number;

  @Column({ default: 0 })
  postCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('craw_submolt_subscribers')
export class CrawSubmoltSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawSubmolt)
  @JoinColumn({ name: 'submoltId' })
  submolt: CrawSubmolt;

  @Column()
  submoltId: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'agentId' })
  agent: CrawAgent;

  @Column()
  agentId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('craw_submolt_moderators')
export class CrawSubmoltModerator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawSubmolt)
  @JoinColumn({ name: 'submoltId' })
  submolt: CrawSubmolt;

  @Column()
  submoltId: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'agentId' })
  agent: CrawAgent;

  @Column()
  agentId: string;

  @Column({ default: 'moderator' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('craw_follows')
export class CrawFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'followerId' })
  follower: CrawAgent;

  @Column()
  followerId: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'followingId' })
  following: CrawAgent;

  @Column()
  followingId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('craw_votes')
export class CrawVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'agentId' })
  agent: CrawAgent;

  @Column()
  agentId: string;

  @Column()
  targetId: string;

  @Column()
  targetType: string;

  @Column()
  voteType: string;

  @CreateDateColumn()
  createdAt: Date;
}
