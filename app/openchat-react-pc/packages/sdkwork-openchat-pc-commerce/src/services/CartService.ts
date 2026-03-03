import { apiClient } from "@sdkwork/openchat-pc-kernel";
import type { CartItem } from "../types";

function responseData<T>(response: unknown): T {
  return (response as { data: T }).data;
}

export interface AddToCartParams {
  productId: string;
  quantity: number;
  skuId?: string;
}

export interface UpdateCartItemParams {
  itemId: string;
  quantity: number;
}

export interface CartSummary {
  items: CartItem[];
  totalCount: number;
  selectedCount: number;
  totalAmount: number;
  selectedAmount: number;
}

class CartServiceImpl {
  private readonly baseUrl = "/commerce/cart";

  async getCart(): Promise<CartSummary> {
    const response = await apiClient.get(this.baseUrl);
    return responseData<CartSummary>(response);
  }

  async getCartItemCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/count`);
      const data = responseData<{ count?: number }>(response);
      return data.count || 0;
    } catch {
      return 0;
    }
  }

  async addToCart(params: AddToCartParams): Promise<CartItem> {
    const response = await apiClient.post(`${this.baseUrl}/items`, params);
    return responseData<CartItem>(response);
  }

  async updateCartItem(params: UpdateCartItemParams): Promise<CartItem> {
    const response = await apiClient.put(`${this.baseUrl}/items/${params.itemId}`, {
      quantity: params.quantity,
    });
    return responseData<CartItem>(response);
  }

  async removeFromCart(itemId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/items/${itemId}`);
  }

  async selectItem(itemId: string, selected: boolean): Promise<void> {
    await apiClient.put(`${this.baseUrl}/items/${itemId}/select`, { selected });
  }

  async selectAll(selected: boolean): Promise<void> {
    await apiClient.put(`${this.baseUrl}/select-all`, { selected });
  }

  async clearCart(): Promise<void> {
    await apiClient.delete(this.baseUrl);
  }

  async clearSelected(): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/selected`);
  }
}

export const CartService = new CartServiceImpl();
