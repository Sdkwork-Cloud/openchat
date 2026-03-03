import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { RTCCallSession } from './rtc-call-session.entity';

@Entity('chat_rtc_call_participants')
@Index('idx_rtc_call_participants_session', ['sessionId'])
@Index('idx_rtc_call_participants_user', ['userId'])
@Index('idx_rtc_call_participants_status', ['status'])
@Index(
  'idx_rtc_call_participants_session_user_active_unique',
  ['sessionId', 'userId'],
  { unique: true, where: '"is_deleted" = false' },
)
@Check(`"status" IN ('invited', 'joined', 'left', 'rejected', 'kicked', 'timeout')`)
@Check(`"role" IN ('caller', 'callee', 'participant', 'host', 'observer', 'ai')`)
@Check(`"leave_time" IS NULL OR "join_time" IS NULL OR "leave_time" >= "join_time"`)
export class RTCCallParticipant extends BaseEntity {
  @Column({ type: 'bigint', nullable: false, name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => RTCCallSession, { nullable: false })
  @JoinColumn({ name: 'session_id' })
  session: RTCCallSession;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'participant' })
  role: 'caller' | 'callee' | 'participant' | 'host' | 'observer' | 'ai';

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'invited' })
  status: 'invited' | 'joined' | 'left' | 'rejected' | 'kicked' | 'timeout';

  @Column({ type: 'timestamp', nullable: true, name: 'join_time' })
  joinTime?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'leave_time' })
  leaveTime?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'leave_reason' })
  leaveReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
