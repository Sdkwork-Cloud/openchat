/**
 * Commerce Module Type Definitions
 * 电商模块类型定义
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  cover: string;
  category: ProductCategory;
  tags: string[];
  stock: number;
  sales: number;
  rating: number;
  reviewCount: number;
  specifications: Record<string, string>;
  detailImages: string[];
  isOnSale: boolean;
  discount?: number;
  merchantId: string;
  merchantName: string;
  createTime: string;
  updateTime: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
  children?: ProductCategory[];
  sortOrder: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  selected: boolean;
  skuId?: string;
  skuInfo?: Record<string, string>;
  addTime: string;
}

export type OrderStatus = 
  | 'pending_payment' 
  | 'pending_shipment' 
  | 'shipped' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled' 
  | 'refunding' 
  | 'refunded';

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  payAmount: number;
  address: ShippingAddress;
  remark?: string;
  createTime: string;
  payTime?: string;
  shipTime?: string;
  receiveTime?: string;
  completeTime?: string;
  cancelTime?: string;
  logistics?: LogisticsInfo;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  totalAmount: number;
  skuInfo?: Record<string, string>;
}

export interface ShippingAddress {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface LogisticsInfo {
  company: string;
  trackingNo: string;
  traces: LogisticsTrace[];
}

export interface LogisticsTrace {
  time: string;
  content: string;
  location?: string;
}

export interface DistributionInfo {
  userId: string;
  level: number;
  totalSales: number;
  totalCommission: number;
  availableCommission: number;
  withdrawnCommission: number;
  teamSize: number;
  directMembers: number;
  inviteCode: string;
  inviteLink: string;
  qrCodeUrl: string;
}

export interface CommissionRecord {
  id: string;
  type: 'order' | 'withdraw' | 'adjust';
  amount: number;
  status: 'pending' | 'settled' | 'cancelled';
  orderId?: string;
  orderNo?: string;
  fromUserId?: string;
  fromUserName?: string;
  level: number;
  commissionRate: number;
  createTime: string;
  settleTime?: string;
  remark?: string;
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  images: string[];
  tags: string[];
  rating: number;
  orderCount: number;
  status: 'active' | 'paused' | 'pending';
  createTime: string;
}
