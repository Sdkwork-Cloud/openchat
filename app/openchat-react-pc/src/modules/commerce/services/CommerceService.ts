import { apiClient } from '@/services/api.client';
import { Product, ProductCategory } from '../types';

export interface ProductQueryParams {
  categoryId?: string | null;
  search?: string;
  sort?: 'default' | 'price-asc' | 'price-desc' | 'sales' | 'rating';
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

class CommerceServiceImpl {
  private readonly baseUrl = '/commerce';

  async getCategories(): Promise<ProductCategory[]> {
    const response = await apiClient.get(`${this.baseUrl}/categories`);
    return response.data;
  }

  async getProducts(params: ProductQueryParams): Promise<ProductListResponse> {
    const queryParams: Record<string, string | number | boolean> = {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
    if (params.categoryId) queryParams.categoryId = params.categoryId;
    if (params.search) queryParams.search = params.search;
    if (params.sort) queryParams.sort = params.sort;
    
    const response = await apiClient.get(`${this.baseUrl}/products`, {
      params: queryParams,
    });
    return response.data;
  }

  async getProductDetail(productId: string): Promise<Product> {
    const response = await apiClient.get(`${this.baseUrl}/products/${productId}`);
    return response.data;
  }

  async getRecommendedProducts(productId: string, limit: number = 8): Promise<Product[]> {
    const response = await apiClient.get(`${this.baseUrl}/products/${productId}/recommended`, {
      params: { limit },
    });
    return response.data;
  }

  async getHotProducts(limit: number = 10): Promise<Product[]> {
    const response = await apiClient.get(`${this.baseUrl}/products/hot`, {
      params: { limit },
    });
    return response.data;
  }

  async getNewArrivals(limit: number = 10): Promise<Product[]> {
    const response = await apiClient.get(`${this.baseUrl}/products/new`, {
      params: { limit },
    });
    return response.data;
  }
}

export const CommerceService = new CommerceServiceImpl();
