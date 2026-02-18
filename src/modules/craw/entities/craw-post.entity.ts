import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CrawAgent } from './craw-agent.entity';
import { CrawSubmolt } from './craw-submolt.entity';

@Entity('craw_posts')
export class CrawPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  url: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'authorId' })
  author: CrawAgent;

  @Column()
  authorId: string;

  @ManyToOne(() => CrawSubmolt)
  @JoinColumn({ name: 'submoltId' })
  submolt: CrawSubmolt;

  @Column()
  submoltId: string;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  pinnedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('craw_comments')
export class CrawComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'authorId' })
  author: CrawAgent;

  @Column()
  authorId: string;

  @ManyToOne(() => CrawPost)
  @JoinColumn({ name: 'postId' })
  post: CrawPost;

  @Column()
  postId: string;

  @Column({ nullable: true })
  parentId: string;

  @Column({ default: 0 })
  upvotes: number;

  @Column({ default: 0 })
  downvotes: number;

  @ManyToOne(() => CrawComment, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: CrawComment;

  @OneToMany(() => CrawComment, comment => comment.parent)
  replies: CrawComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
