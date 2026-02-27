import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result, Page } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { 
  WalletData, 
  Transaction, 
  TransactionType, 
  TransactionFilter, 
  WalletStats,
  PaymentMethod,
  RedPacket
} from '../types';

const MOCK_TRANSACTIONS: Partial<Transaction>[] = [
  { id: 'tx_1', title: '余额宝收益发放', amount: 12.45, category: '理财', type: 'income', status: 'completed', description: '每日收益自动到账' },
  { id: 'tx_2', title: '星巴克咖啡', amount: -38.00, category: '餐饮', type: 'expense', status: 'completed', description: '门店消费' },
  { id: 'tx_3', title: '转账给张三', amount: -200.00, category: '转账', type: 'expense', status: 'completed', description: '朋友转账' },
  { id: 'tx_4', title: '工资收入', amount: 15000.00, category: '工资', type: 'income', status: 'completed', description: '月薪发放' },
  { id: 'tx_5', title: '购买AI绘图额度', amount: -99.00, category: '购物', type: 'expense', status: 'completed', description: 'Midjourney充值' },
  { id: 'tx_6', title: '红包收入', amount: 88.88, category: '红包', type: 'income', status: 'completed', description: '春节红包' },
  { id: 'tx_7', title: '滴滴出行', amount: -45.50, category: '交通', type: 'expense', status: 'completed', description: '打车费用' },
  { id: 'tx_8', title: '退款', amount: 199.00, category: '退款', type: 'income', status: 'completed', description: '商品退款' },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm_1', type: 'alipay', name: '支付宝', icon: '💙', isDefault: true, isEnabled: true },
  { id: 'pm_2', type: 'wechat', name: '微信支付', icon: '💚', isDefault: false, isEnabled: true },
  { id: 'pm_3', type: 'card', name: '招商银行', icon: '💳', last4: '8888', isDefault: false, isEnabled: true },
  { id: 'pm_4', type: 'bank', name: '工商银行', icon: '🏦', last4: '6666', isDefault: false, isEnabled: false },
];

class WalletServiceImpl extends AbstractStorageService<Transaction> {
  private PAYMENT_METHODS_KEY = 'sys_wallet_payment_methods_v1';
  private baseBalance = 88888.00;

  constructor() {
    super('sys_wallet_transactions_pc_v1');
  }

  protected async onInitialize() {
    const list = await this.loadData();
    if (list.length === 0) {
      const now = Date.now();
      for (const tx of MOCK_TRANSACTIONS) {
        await this.saveItem({
          ...tx,
          createTime: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
          updateTime: now
        } as Transaction);
      }
    }
  }

  async getWalletData(): Promise<Result<WalletData>> {
    const list = await this.loadData();
    const transactionSum = list.reduce((acc, curr) => acc + curr.amount, 0);
    
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date().setDate(1);
    
    const dailyIncome = list
      .filter(t => t.type === 'income' && t.createTime && t.createTime >= startOfDay)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const monthlyExpense = list
      .filter(t => t.type === 'expense' && t.createTime && t.createTime >= startOfMonth)
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    return {
      success: true,
      data: {
        balance: this.baseBalance + transactionSum,
        currency: 'CNY',
        frozen: 0,
        dailyIncome: dailyIncome > 0 ? dailyIncome : 12.45,
        monthlyExpense
      }
    };
  }

  async getTransactions(filter: TransactionFilter = {}, page: number = 1, size: number = 20): Promise<Result<Page<Transaction>>> {
    let list = await this.loadData();

    if (filter.type) {
      list = list.filter(t => t.type === filter.type);
    }

    if (filter.category) {
      list = list.filter(t => t.category === filter.category);
    }

    if (filter.startTime !== undefined) {
      list = list.filter(t => t.createTime && t.createTime >= filter.startTime!);
    }

    if (filter.endTime !== undefined) {
      list = list.filter(t => t.createTime && t.createTime <= filter.endTime!);
    }

    if (filter.minAmount !== undefined) {
      list = list.filter(t => Math.abs(t.amount) >= filter.minAmount!);
    }

    if (filter.maxAmount !== undefined) {
      list = list.filter(t => Math.abs(t.amount) <= filter.maxAmount!);
    }

    list.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));

    const total = list.length;
    const start = (page - 1) * size;
    const content = list.slice(start, start + size);

    return {
      success: true,
      data: {
        content,
        total,
        page,
        size,
        totalPages: Math.ceil(total / size)
      }
    };
  }

  async addTransaction(data: Partial<Transaction>): Promise<Result<Transaction>> {
    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title || '未命名交易',
      amount: data.amount || 0,
      category: data.category || '其他',
      type: data.type || (data.amount && data.amount >= 0 ? 'income' : 'expense'),
      status: data.status || 'completed',
      description: data.description,
      relatedId: data.relatedId,
      paymentMethod: data.paymentMethod,
      createTime: Date.now(),
      updateTime: Date.now()
    };

    await this.saveItem(tx);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: tx };
  }

  async getStats(): Promise<Result<WalletStats>> {
    const list = await this.loadData();
    
    const totalIncome = list
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalExpense = list
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    const categoryBreakdown: Record<string, number> = {};
    list.forEach(t => {
      if (t.type === 'expense') {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
      }
    });

    return {
      success: true,
      data: {
        totalIncome,
        totalExpense,
        transactionCount: list.length,
        categoryBreakdown
      }
    };
  }

  async getPaymentMethods(): Promise<Result<PaymentMethod[]>> {
    const stored = localStorage.getItem(this.PAYMENT_METHODS_KEY);
    if (stored) {
      return { success: true, data: JSON.parse(stored) };
    }
    return { success: true, data: MOCK_PAYMENT_METHODS };
  }

  async savePaymentMethod(method: PaymentMethod): Promise<Result<void>> {
    const { data: methods = [] } = await this.getPaymentMethods();
    const index = methods.findIndex(m => m.id === method.id);
    
    if (index >= 0) {
      methods[index] = method;
    } else {
      methods.push(method);
    }

    localStorage.setItem(this.PAYMENT_METHODS_KEY, JSON.stringify(methods));
    return { success: true };
  }

  async setDefaultPaymentMethod(id: string): Promise<Result<void>> {
    const { data: methods = [] } = await this.getPaymentMethods();
    methods.forEach(m => {
      m.isDefault = m.id === id;
    });
    localStorage.setItem(this.PAYMENT_METHODS_KEY, JSON.stringify(methods));
    return { success: true };
  }

  async transfer(toUserId: string, amount: number, message?: string): Promise<Result<Transaction>> {
    if (amount <= 0) {
      return { success: false, message: '转账金额必须大于0' };
    }

    const { data: wallet } = await this.getWalletData();
    if (!wallet || wallet.balance < amount) {
      return { success: false, message: '余额不足' };
    }

    const tx = await this.addTransaction({
      title: `转账给用户`,
      amount: -amount,
      category: '转账',
      type: 'expense',
      description: message || '转账'
    });

    return tx;
  }

  async createRedPacket(amount: number, count: number, message: string): Promise<Result<RedPacket>> {
    if (amount <= 0 || count <= 0) {
      return { success: false, message: '金额和数量必须大于0' };
    }

    const { data: wallet } = await this.getWalletData();
    if (!wallet || wallet.balance < amount) {
      return { success: false, message: '余额不足' };
    }

    const redPacket: RedPacket = {
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      count,
      remainingCount: count,
      message,
      senderId: 'current_user',
      senderName: 'AI User',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      expireTime: Date.now() + 24 * 60 * 60 * 1000,
      isReceived: false
    };

    await this.addTransaction({
      title: '发红包',
      amount: -amount,
      category: '红包',
      type: 'expense',
      description: message
    });

    return { success: true, data: redPacket };
  }

  getCategories(): string[] {
    return ['全部', '餐饮', '购物', '交通', '转账', '工资', '理财', '红包', '退款', '其他'];
  }
}

export const WalletService = new WalletServiceImpl();
