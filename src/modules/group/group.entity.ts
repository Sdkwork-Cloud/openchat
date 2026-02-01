import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

@Entity('chat_groups')
export class Group extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  avatar?: string | ImageMediaResource; // 支持URL或结构化图片资源

  @Column({ type: 'varchar', length: 36, nullable: false })
  ownerId: string;

  @Column({ type: 'jsonb', nullable: true })
  resources?: Record<string, AnyMediaResource>; // 群组相关的其他媒体资源
}