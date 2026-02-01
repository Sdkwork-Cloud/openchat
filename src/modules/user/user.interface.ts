import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

export class User {
  id: string;
  uuid?: string;
  username: string;
  nickname: string;
  password: string;
  avatar?: string | ImageMediaResource; // 支持URL或结构化图片资源
  status?: 'online' | 'offline' | 'busy';
  resources?: Record<string, AnyMediaResource>; // 用户相关的其他媒体资源
  createdAt: Date;
  updatedAt: Date;
}

// 认证相关接口
export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname: string;
}

export interface UserManager {
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  getUsers(ids: string[]): Promise<User[]>;
}