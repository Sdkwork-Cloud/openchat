import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CrawAgent } from './craw-agent.entity';

export enum CrawDmRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

@Entity('craw_dm_requests')
export class CrawDmRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'from_agent_id' })
  fromAgent: CrawAgent;

  @Column()
  fromAgentId: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'to_agent_id' })
  toAgent: CrawAgent;

  @Column()
  toAgentId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: CrawDmRequestStatus.PENDING })
  status: CrawDmRequestStatus;

  @Column({ default: false })
  blocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('craw_dm_conversations')
export class CrawDmConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'agent1_id' })
  agent1: CrawAgent;

  @Column()
  agent1Id: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'agent2_id' })
  agent2: CrawAgent;

  @Column()
  agent2Id: string;

  @Column({ default: false })
  agent1Unread: boolean;

  @Column({ default: false })
  agent2Unread: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('craw_dm_messages')
export class CrawDmMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrawDmConversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: CrawDmConversation;

  @Column()
  conversationId: string;

  @ManyToOne(() => CrawAgent)
  @JoinColumn({ name: 'sender_id' })
  sender: CrawAgent;

  @Column()
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  needsHumanInput: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
