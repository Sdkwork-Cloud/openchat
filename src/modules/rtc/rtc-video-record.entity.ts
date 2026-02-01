import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RTCRoom } from './rtc-room.entity';
import { BaseEntity } from '../../common/base.entity';

@Entity('chat_rtc_video_records')
export class RTCVideoRecord extends BaseEntity {
  @Column({ type: 'bigint', nullable: false })
  roomId: string; // 关联到RTCRoom

  @ManyToOne(() => RTCRoom, { nullable: false })
  @JoinColumn({ name: 'roomId' })
  room: RTCRoom;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId?: string; // 录制者的用户ID，可选

  @Column({ type: 'varchar', length: 255, nullable: false })
  fileName: string; // 视频文件名

  @Column({ type: 'varchar', length: 100, nullable: false })
  filePath: string; // 视频文件存储路径

  @Column({ type: 'varchar', length: 50, nullable: false })
  fileType: string; // 视频文件类型，如mp4、webm等

  @Column({ type: 'bigint', nullable: false })
  fileSize: number; // 视频文件大小（字节）

  @Column({ type: 'timestamp', nullable: false })
  startTime: Date; // 录制开始时间

  @Column({ type: 'timestamp', nullable: false })
  endTime: Date; // 录制结束时间

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'completed' })
  status: 'recording' | 'completed' | 'failed' | 'processing'; // 录制状态

  @Column({ type: 'text', nullable: true })
  metadata?: string; // 视频元数据，JSON格式

  @Column({ type: 'text', nullable: true })
  errorMessage?: string; // 错误信息，当status为failed时
}
