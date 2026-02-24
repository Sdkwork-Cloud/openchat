
// --- Domain Entities Base ---
export interface BaseEntity {
  id: string;
  createTime: number;
  updateTime: number;
}

// --- Standard Response Wrapper ---
export interface Result<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// --- Pagination Standard ---
export interface PageRequest {
  page: number;
  size: number;
}

export interface Page<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

// --- Advanced Criteria API (Spring Data Style) ---
export type SortOrder = 'asc' | 'desc';

export interface Sort {
  field: string;
  order: SortOrder;
}

// Extended operators for sophisticated filtering
export type FilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in' | 'array-contains';

export interface FilterCriterion {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface QueryParams {
  pageRequest?: PageRequest;
  sort?: Sort;
  filters?: FilterCriterion[]; 
  keywords?: string; // Global fuzzy search
}

// --- Service Interface Definition ---
export interface IBaseService<T extends BaseEntity> {
  save(entity: Partial<T>): Promise<Result<T>>;
  saveAll(entities: T[]): Promise<Result<boolean>>;
  findById(id: string): Promise<Result<T>>;
  deleteById(id: string): Promise<Result<boolean>>;
  
  // High-performance query interface
  findAll(params?: QueryParams): Promise<Result<Page<T>>>;
  count(params?: QueryParams): Promise<number>;

  // Reactive capabilities
  subscribe(callback: (event: any) => void): () => void;
}
