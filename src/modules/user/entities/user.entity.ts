import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { AnyMediaResource, ImageMediaResource } from '../../im-provider/media-resource.interface';

@Entity('chat_users')
export class UserEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    comment: '用户名，唯一标识',
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
    comment: '用户邮箱，唯一标识',
  })
  email?: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
    comment: '用户手机号，唯一标识',
  })
  phone?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: '用户昵称',
  })
  nickname: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    select: false,
    comment: '密码哈希值',
  })
  password: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '用户头像，支持URL或结构化图片资源',
  })
  avatar?: string | ImageMediaResource;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'offline',
    comment: '用户在线状态',
  })
  status?: 'online' | 'offline' | 'busy';

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '用户相关的其他媒体资源',
  })
  resources?: Record<string, AnyMediaResource>;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_login_at',
    comment: '最后登录时间',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    name: 'last_login_ip',
    comment: '最后登录IP',
  })
  lastLoginIp?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'deleted_at',
    comment: '删除时间',
  })
  deletedAt?: Date;
}
