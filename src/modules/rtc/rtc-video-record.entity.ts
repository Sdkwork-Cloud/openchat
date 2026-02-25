import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RTCRoom } from './rtc-room.entity';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_video_records')
export class RTCVideoRecord extends BaseEntity {
  @Column({ type: 'bigint', nullable: false, name: 'room_id' })
  roomId: string;

  @ManyToOne(() => RTCRoom, { nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: RTCRoom;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 50, nullable: false, name: 'file_type' })
  fileType: string;

  @Column({ type: 'bigint', nullable: false, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'timestamp', nullable: false, name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: false, name: 'end_time' })
  endTime: Date;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'completed' })
  status: 'recording' | 'completed' | 'failed' | 'processing';

  @Column({ type: 'text', nullable: true })
  metadata?: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;
}
