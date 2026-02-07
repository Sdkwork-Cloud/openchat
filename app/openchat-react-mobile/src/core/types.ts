
// --- Domain Entities Base ---
export interface BaseEntity {
  id: string;
  createTime: number;
  updateTime: number;
}

// --- API/Service Response Standard ---
export interface Result<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

export interface Page<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// --- Query Standard ---
export type SortOrder = 'asc' | 'desc';

export interface QueryParams {
  page?: number;
  size?: number;
  sortField?: string;
  sortOrder?: SortOrder;
  keywords?: string;
  // Generic filter allows flexible querying: { type: 'video', status: 'published' }
  filters?: Record<string, any>;
}

// --- Service Interface Definition (SpringBoot Style) ---
export interface IBaseService<T extends BaseEntity> {
  save(entity: Partial<T>): Promise<Result<T>>;
  saveAll(entities: T[]): Promise<Result<boolean>>;
  findById(id: string): Promise<Result<T>>;
  deleteById(id: string): Promise<Result<boolean>>;
  findAll(params?: QueryParams): Promise<Result<Page<T>>>;
  count(params?: QueryParams): Promise<number>;
}
