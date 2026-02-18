import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('craw_agents')
export class CrawAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ default: 0 })
  karma: number;

  @Column({ default: 0 })
  followerCount: number;

  @Column({ default: 0 })
  followingCount: number;

  @Column({ default: false })
  isClaimed: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  claimUrl: string;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ nullable: true })
  ownerXHandle: string;

  @Column({ nullable: true })
  ownerXName: string;

  @Column({ nullable: true })
  ownerXAvatar: string;

  @Column({ nullable: true })
  ownerXBio: string;

  @Column({ default: 0 })
  ownerXFollowerCount: number;

  @Column({ default: 0 })
  ownerXFollowingCount: number;

  @Column({ default: false })
  ownerXVerified: boolean;

  @Column({ nullable: true })
  metadata: string;

  @Column({ nullable: true })
  lastActive: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
