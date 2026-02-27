/**
 * 核心类型定义
 */

// 基础实体接口
export interface BaseEntity {
  id: string;
  createTime?: number;
  updateTime?: number;
}

// 通用结果类型
export interface Result<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

// 分页查询
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页结果
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 分页响应
export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 分页参数
export interface Page<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
