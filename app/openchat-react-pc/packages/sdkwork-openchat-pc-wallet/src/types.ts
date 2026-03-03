import type { BaseEntity } from '@sdkwork/openchat-pc-contracts';

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface WalletData {
  balance: number;
  currency: string;
  frozen: number;
  dailyIncome: number;
  monthlyExpense: number;
}

export interface Transaction extends BaseEntity {
  title: string;
  amount: number;
  category: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  relatedId?: string;
  paymentMethod?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'alipay' | 'wechat' | 'bank';
  name: string;
  icon: string;
  last4?: string;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface RedPacket {
  id: string;
  amount: number;
  count: number;
  remainingCount: number;
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  expireTime: number;
  isReceived: boolean;
}

export interface TransferData {
  recipientId: string;
  recipientName: string;
  amount: number;
  message?: string;
}

export interface TransactionFilter {
  type?: TransactionType;
  category?: string;
  startTime?: number;
  endTime?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface WalletStats {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  categoryBreakdown: Record<string, number>;
}


