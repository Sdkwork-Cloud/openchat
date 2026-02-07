
import { Platform } from '../platform';
import { IBaseService, Result, Page, QueryParams, BaseEntity } from './types';

/**
 * Abstract Base Service (The "Strategy Context")
 * 
 * Implements the "Invariant" parts of the business logic:
 * - Pagination algorithms
 * - Sorting algorithms
 * - Basic CRUD flow
 * 
 * Delegates the "Variant" parts (Persistence) to Platform.storage
 */
export abstract class AbstractStorageService<T extends BaseEntity> implements IBaseService<T> {
  protected abstract readonly STORAGE_KEY: string;
  
  // Cache to reduce IO operations (Memory Layer)
  protected cache: T[] | null = null;

  /**
   * Loads data from the platform storage strategy (LocalStorage, SQLite, FS)
   */
  protected async loadData(): Promise<T[]> {
    if (this.cache) return this.cache;
    
    try {
      const raw = await Platform.storage.get(this.STORAGE_KEY);
      if (!raw) {
        this.cache = [];
      } else {
        this.cache = JSON.parse(raw) as T[];
      }
    } catch (e) {
      console.warn(`[${this.STORAGE_KEY}] Data corruption or empty, resetting.`, e);
      this.cache = [];
    }
    return this.cache || [];
  }

  /**
   * Persists data using the platform storage strategy
   */
  protected async commit(): Promise<void> {
    if (this.cache) {
      await Platform.storage.set(this.STORAGE_KEY, JSON.stringify(this.cache));
    }
  }

  // --- CRUD Implementation ---

  async save(entity: Partial<T>): Promise<Result<T>> {
    const list = await this.loadData();
    const now = Date.now();
    
    let target: T;
    const existingIndex = entity.id ? list.findIndex(item => item.id === entity.id) : -1;

    if (existingIndex > -1) {
      // Update
      target = { ...list[existingIndex], ...entity, updateTime: now };
      list[existingIndex] = target;
    } else {
      // Create
      // Ensure ID exists
      const newId = entity.id || crypto.randomUUID();
      target = { ...entity, id: newId, createTime: now, updateTime: now } as T;
      list.push(target);
    }

    await this.commit();
    return { success: true, data: target };
  }

  async saveAll(entities: T[]): Promise<Result<boolean>> {
    this.cache = entities;
    await this.commit();
    return { success: true, data: true };
  }

  async findById(id: string): Promise<Result<T>> {
    const list = await this.loadData();
    const item = list.find(i => i.id === id);
    if (item) return { success: true, data: item };
    return { success: false, message: 'Not found' };
  }

  async deleteById(id: string): Promise<Result<boolean>> {
    const list = await this.loadData();
    const initialLen = list.length;
    this.cache = list.filter(item => item.id !== id);
    
    if (this.cache.length !== initialLen) {
      await this.commit();
      return { success: true, data: true };
    }
    return { success: false, message: 'Not found' };
  }

  /**
   * Powerful generic query method with Filtering, Sorting, and Pagination.
   * This brings SpringBoot-like JPA capabilities to the frontend.
   */
  async findAll(params?: QueryParams): Promise<Result<Page<T>>> {
    let list = [...await this.loadData()];

    // 1. Filtering
    if (params?.filters) {
      list = list.filter(item => {
        return Object.entries(params.filters!).every(([key, value]) => {
          // @ts-ignore
          return item[key] === value;
        });
      });
    }

    // 2. Keyword Search (Generic text search)
    if (params?.keywords) {
      const lowerKey = params.keywords.toLowerCase();
      list = list.filter(item => JSON.stringify(item).toLowerCase().includes(lowerKey));
    }

    // 3. Sorting
    if (params?.sortField) {
      list.sort((a, b) => {
        // @ts-ignore
        const valA = a[params.sortField!];
        // @ts-ignore
        const valB = b[params.sortField!];
        
        if (valA < valB) return params.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return params.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
        // Default sort: Create Time DESC
        list.sort((a, b) => b.createTime - a.createTime);
    }

    // 4. Pagination
    const page = params?.page || 1;
    const size = params?.size || 1000; // Default to "all" if not specified
    const total = list.length;
    const totalPages = Math.ceil(total / size);
    
    const startIndex = (page - 1) * size;
    const pagedContent = list.slice(startIndex, startIndex + size);

    return {
      success: true,
      data: {
        content: pagedContent,
        total,
        page,
        size,
        totalPages
      }
    };
  }

  async count(params?: QueryParams): Promise<number> {
      const res = await this.findAll(params);
      return res.data?.total || 0;
  }
}
