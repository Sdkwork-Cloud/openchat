
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';

export interface WalletData {
  balance: number;
  currency: string;
  dailyIncome: number;
}

export interface Transaction extends BaseEntity {
  title: string;
  amount: number; // Positive for income, negative for expense
  category: string;
  type: 'income' | 'expense';
}

class WalletServiceImpl extends AbstractStorageService<Transaction> {
  protected STORAGE_KEY = 'sys_wallet_transactions_v1';
  
  // Mock balance logic (In a real app, balance is derived from transactions or a separate record)
  private baseBalance = 88888.00;

  constructor() {
      super();
      this.initMockTransactions();
  }

  private async initMockTransactions() {
      const list = await this.loadData();
      if (list.length === 0) {
          const now = Date.now();
          const seeds: Partial<Transaction>[] = [
              { id: 'tx_1', title: '余额宝收益发放', amount: 12.45, category: '理财', type: 'income' },
              { id: 'tx_2', title: '星巴克咖啡', amount: -38.00, category: '餐饮', type: 'expense' },
              { id: 'tx_3', title: '转账给朋友', amount: -200.00, category: '转账', type: 'expense' },
              { id: 'tx_4', title: '工资收入', amount: 15000.00, category: '工资', type: 'income' }
          ];
          
          for (const s of seeds) {
              await this.save({ ...s, createTime: now - Math.random() * 10000000, updateTime: now } as Transaction);
          }
      }
  }

  async getBalance(): Promise<Result<WalletData>> {
      // Calculate dynamic balance based on stored transactions
      const list = await this.loadData();
      
      // Simply summing mock logic for demo
      // In production, you'd have a 'Balance' entity.
      const transactionSum = list.reduce((acc, curr) => acc + curr.amount, 0);
      const totalBalance = this.baseBalance + transactionSum;

      // Find today's income
      const startOfDay = new Date().setHours(0,0,0,0);
      const dailyIncome = list
        .filter(t => t.type === 'income' && t.createTime >= startOfDay)
        .reduce((acc, curr) => acc + curr.amount, 0);

      return { 
          success: true, 
          data: {
              balance: totalBalance,
              currency: 'CNY',
              dailyIncome: dailyIncome > 0 ? dailyIncome : 12.45 // Fallback mock
          } 
      };
  }

  async addTransaction(title: string, amount: number, category: string): Promise<Result<Transaction>> {
      const tx: Partial<Transaction> = {
          title,
          amount,
          category,
          type: amount >= 0 ? 'income' : 'expense'
      };
      return await this.save(tx);
  }

  async getTransactions(page: number = 1, size: number = 20): Promise<Result<Page<Transaction>>> {
      return await this.findAll({ 
          pageRequest: { page, size },
          sort: { field: 'createTime', order: 'desc' }
      });
  }
}

export const WalletService = new WalletServiceImpl();
