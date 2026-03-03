import { apiClient, IS_DEV, type Page, type Result } from "@sdkwork/openchat-pc-kernel";
import type {
  PaymentMethod,
  RedPacket,
  Transaction,
  TransactionFilter,
  WalletData,
  WalletStats,
} from "../types";

const WALLET_ENDPOINT = "/wallet";
const paymentMethodsStorageKey = "openchat.wallet.paymentMethods";
const favoriteTransactionsStorageKey = "openchat.wallet.favoriteTransactions";
const recentTransactionsStorageKey = "openchat.wallet.recentTransactions";
const maxRecentTransactionCount = 16;
const now = Date.now();

const seedTransactions: Transaction[] = [
  {
    id: "tx-1",
    title: "Salary",
    amount: 15000,
    category: "Salary",
    type: "income",
    status: "completed",
    description: "Monthly salary payment",
    createTime: now - 20 * 24 * 60 * 60 * 1000,
    updateTime: now - 20 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-2",
    title: "OpenChat Pro",
    amount: -299,
    category: "Subscription",
    type: "expense",
    status: "completed",
    description: "Pro membership renewal",
    createTime: now - 4 * 24 * 60 * 60 * 1000,
    updateTime: now - 4 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-3",
    title: "Team reimbursement",
    amount: 88.8,
    category: "Transfer",
    type: "income",
    status: "completed",
    description: "Shared lunch reimbursement",
    createTime: now - 2 * 24 * 60 * 60 * 1000,
    updateTime: now - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "tx-4",
    title: "Coffee",
    amount: -42.5,
    category: "Food",
    type: "expense",
    status: "completed",
    description: "Afternoon coffee and snacks",
    createTime: now - 8 * 60 * 60 * 1000,
    updateTime: now - 8 * 60 * 60 * 1000,
  },
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: "pm-1", type: "alipay", name: "Alipay", icon: "ALP", isDefault: true, isEnabled: true },
  { id: "pm-2", type: "wechat", name: "WeChat Pay", icon: "WCP", isDefault: false, isEnabled: true },
  { id: "pm-3", type: "card", name: "Bank Card", icon: "CRD", last4: "8888", isDefault: false, isEnabled: true },
];

const fallbackCategories = ["Salary", "Subscription", "Food", "Transfer", "Gift", "General"];

type PartialPage<T> = Partial<Page<T>> & { list?: T[]; pageSize?: number };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const result = response as Partial<Result<T>>;
    return {
      success: Boolean(result.success),
      data: (result.data as T | undefined) ?? defaultData,
      message: typeof result.message === "string" ? result.message : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      code: typeof result.code === "number" ? result.code : undefined,
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: ((response as { data: T }).data ?? defaultData) as T };
  }

  if (response === undefined || response === null) {
    return { success: true, data: defaultData };
  }

  return { success: true, data: response as T };
}

function normalizeTransaction(input: Partial<Transaction>): Transaction {
  const amount = toNumber(input.amount);
  const type =
    input.type === "income" || input.type === "expense"
      ? input.type
      : amount >= 0
        ? "income"
        : "expense";
  const status =
    input.status === "pending" || input.status === "failed" || input.status === "completed"
      ? input.status
      : "completed";

  return {
    id: input.id || createId("tx"),
    title: input.title || "Transaction",
    amount,
    category: input.category || "General",
    type,
    status,
    description: input.description,
    relatedId: input.relatedId,
    paymentMethod: input.paymentMethod,
    createTime: toNumber(input.createTime, Date.now()),
    updateTime: toNumber(input.updateTime, Date.now()),
  };
}

function normalizePaymentMethod(input: Partial<PaymentMethod>): PaymentMethod {
  const type =
    input.type === "card" || input.type === "alipay" || input.type === "wechat" || input.type === "bank"
      ? input.type
      : "card";

  return {
    id: input.id || createId("pm"),
    type,
    name: input.name || "Payment Method",
    icon: input.icon || "PM",
    last4: input.last4,
    isDefault: Boolean(input.isDefault),
    isEnabled: input.isEnabled === undefined ? true : Boolean(input.isEnabled),
  };
}

function normalizeWalletData(input: Partial<WalletData>): WalletData {
  return {
    balance: toNumber(input.balance),
    currency: input.currency || "CNY",
    frozen: toNumber(input.frozen),
    dailyIncome: toNumber(input.dailyIncome),
    monthlyExpense: toNumber(input.monthlyExpense),
  };
}

function normalizeStats(input: Partial<WalletStats>): WalletStats {
  return {
    totalIncome: toNumber(input.totalIncome),
    totalExpense: toNumber(input.totalExpense),
    transactionCount: toNumber(input.transactionCount),
    categoryBreakdown:
      input.categoryBreakdown && typeof input.categoryBreakdown === "object"
        ? Object.entries(input.categoryBreakdown).reduce<Record<string, number>>((acc, [key, value]) => {
            acc[key] = toNumber(value);
            return acc;
          }, {})
        : {},
  };
}

function normalizePage(input: unknown, page: number, size: number): Page<Transaction> {
  const payload = input as PartialPage<unknown>;
  const source = Array.isArray(payload.content) ? payload.content : Array.isArray(payload.list) ? payload.list : [];
  const content = source.map((item) => normalizeTransaction(item as Partial<Transaction>));
  const total = toNumber(payload.total, content.length);
  const currentPage = toNumber(payload.page, page);
  const currentSize = toNumber(payload.size ?? payload.pageSize, size);

  return {
    content,
    total,
    page: currentPage,
    size: currentSize,
    totalPages: toNumber(payload.totalPages, Math.max(1, Math.ceil(total / Math.max(1, currentSize)))),
  };
}

class WalletServiceImpl {
  private baseBalance = 8000;
  private fallbackTransactions: Transaction[] = seedTransactions.map((item) => ({ ...item }));
  private fallbackPaymentMethods: PaymentMethod[] = defaultPaymentMethods.map((item) => ({ ...item }));
  private favoriteTransactionIds = new Set<string>();
  private recentTransactionIds: string[] = [];

  constructor() {
    const persisted = this.readPaymentMethodsFromStorage();
    if (persisted.length > 0) {
      this.fallbackPaymentMethods = persisted;
    }

    this.favoriteTransactionIds = this.readFavoriteTransactionsFromStorage();
    this.recentTransactionIds = this.readRecentTransactionsFromStorage();
  }

  private async withFallback<T>(
    apiTask: () => Promise<Result<T>>,
    fallbackTask: () => Result<T> | Promise<Result<T>>,
  ): Promise<Result<T>> {
    try {
      return await apiTask();
    } catch (error) {
      if (IS_DEV) {
        return fallbackTask();
      }
      throw error;
    }
  }

  private readPaymentMethodsFromStorage(): PaymentMethod[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(paymentMethodsStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizePaymentMethod(item as Partial<PaymentMethod>))
        : [];
    } catch {
      return [];
    }
  }

  private persistPaymentMethods(methods: PaymentMethod[]): void {
    this.fallbackPaymentMethods = methods.map((item) => ({ ...item }));

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(paymentMethodsStorageKey, JSON.stringify(this.fallbackPaymentMethods));
    }
  }

  private readFavoriteTransactionsFromStorage(): Set<string> {
    if (typeof localStorage === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = localStorage.getItem(favoriteTransactionsStorageKey);
      if (!raw) {
        return new Set<string>();
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return new Set<string>();
      }
      return new Set(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
      return new Set<string>();
    }
  }

  private persistFavoriteTransactions(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(
      favoriteTransactionsStorageKey,
      JSON.stringify(Array.from(this.favoriteTransactionIds)),
    );
  }

  private readRecentTransactionsFromStorage(): string[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(recentTransactionsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, maxRecentTransactionCount);
    } catch {
      return [];
    }
  }

  private persistRecentTransactions(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(
      recentTransactionsStorageKey,
      JSON.stringify(this.recentTransactionIds.slice(0, maxRecentTransactionCount)),
    );
  }

  private buildWalletData(transactions: Transaction[]): WalletData {
    const balance = this.baseBalance + transactions.reduce((acc, item) => acc + item.amount, 0);
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const dailyIncome = transactions
      .filter((item) => item.type === "income" && (item.createTime || 0) >= startOfDay)
      .reduce((sum, item) => sum + item.amount, 0);
    const monthlyExpense = transactions
      .filter((item) => item.type === "expense" && (item.createTime || 0) >= startOfMonth)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return {
      balance,
      currency: "CNY",
      frozen: 0,
      dailyIncome,
      monthlyExpense,
    };
  }

  private buildStats(transactions: Transaction[]): WalletStats {
    const totalIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    const categoryBreakdown = transactions
      .filter((item) => item.type === "expense")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
        return acc;
      }, {});

    return {
      totalIncome,
      totalExpense,
      transactionCount: transactions.length,
      categoryBreakdown,
    };
  }

  private filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
    return transactions
      .filter((item) => (filter.type ? item.type === filter.type : true))
      .filter((item) => (filter.category ? item.category === filter.category : true))
      .filter((item) => (filter.startTime !== undefined ? (item.createTime || 0) >= filter.startTime : true))
      .filter((item) => (filter.endTime !== undefined ? (item.createTime || 0) <= filter.endTime : true))
      .filter((item) => (filter.minAmount !== undefined ? Math.abs(item.amount) >= filter.minAmount : true))
      .filter((item) => (filter.maxAmount !== undefined ? Math.abs(item.amount) <= filter.maxAmount : true))
      .sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
  }

  getFavoriteTransactionIds(): string[] {
    return Array.from(this.favoriteTransactionIds);
  }

  isTransactionFavorite(transactionId: string): boolean {
    return this.favoriteTransactionIds.has(transactionId);
  }

  toggleFavoriteTransaction(transactionId: string): boolean {
    if (this.favoriteTransactionIds.has(transactionId)) {
      this.favoriteTransactionIds.delete(transactionId);
      this.persistFavoriteTransactions();
      return false;
    }

    this.favoriteTransactionIds.add(transactionId);
    this.persistFavoriteTransactions();
    return true;
  }

  getRecentTransactionIds(): string[] {
    return [...this.recentTransactionIds];
  }

  markTransactionOpened(transactionId: string): string[] {
    const filtered = this.recentTransactionIds.filter((id) => id !== transactionId);
    this.recentTransactionIds = [transactionId, ...filtered].slice(0, maxRecentTransactionCount);
    this.persistRecentTransactions();
    return [...this.recentTransactionIds];
  }

  resetWorkspaceState(): void {
    this.favoriteTransactionIds = new Set<string>();
    this.recentTransactionIds = [];

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(favoriteTransactionsStorageKey);
      localStorage.removeItem(recentTransactionsStorageKey);
    }
  }

  async getWalletData(): Promise<Result<WalletData>> {
    return this.withFallback(
      async () => {
        const fallbackData = this.buildWalletData(this.fallbackTransactions);
        const response = await apiClient.get<unknown>(`${WALLET_ENDPOINT}/summary`);
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }
        return {
          ...result,
          data: normalizeWalletData((result.data || fallbackData) as Partial<WalletData>),
        };
      },
      () => ({ success: true, data: this.buildWalletData(this.fallbackTransactions) }),
    );
  }

  async getTransactions(
    filter: TransactionFilter = {},
    page: number = 1,
    size: number = 20,
  ): Promise<Result<Page<Transaction>>> {
    return this.withFallback(
      async () => {
        const fallbackData = normalizePage({ content: [], total: 0, page, size }, page, size);
        const response = await apiClient.get<unknown>(`${WALLET_ENDPOINT}/transactions`, {
          params: {
            type: filter.type,
            category: filter.category,
            startTime: filter.startTime,
            endTime: filter.endTime,
            minAmount: filter.minAmount,
            maxAmount: filter.maxAmount,
            page,
            size,
          },
        });
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }
        return { ...result, data: normalizePage(result.data, page, size) };
      },
      () => {
        const filtered = this.filterTransactions(this.fallbackTransactions, filter);
        const start = (page - 1) * size;
        const content = filtered.slice(start, start + size).map((item) => ({ ...item }));
        return {
          success: true,
          data: {
            content,
            total: filtered.length,
            page,
            size,
            totalPages: Math.max(1, Math.ceil(filtered.length / size)),
          },
        };
      },
    );
  }

  async addTransaction(data: Partial<Transaction>): Promise<Result<Transaction>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${WALLET_ENDPOINT}/transactions`, data);
        const result = toResult<unknown>(response, data);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }
        return { ...result, data: normalizeTransaction((result.data || data) as Partial<Transaction>) };
      },
      () => {
        const paymentMethod = this.fallbackPaymentMethods.find((item) => item.isDefault)?.id;
        const created = normalizeTransaction({
          ...data,
          paymentMethod: data.paymentMethod || paymentMethod,
          createTime: Date.now(),
          updateTime: Date.now(),
        });
        this.fallbackTransactions = [created, ...this.fallbackTransactions];
        return { success: true, data: created };
      },
    );
  }

  async getStats(): Promise<Result<WalletStats>> {
    return this.withFallback(
      async () => {
        const fallbackData = this.buildStats(this.fallbackTransactions);
        const response = await apiClient.get<unknown>(`${WALLET_ENDPOINT}/stats`);
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }
        return {
          ...result,
          data: normalizeStats((result.data || fallbackData) as Partial<WalletStats>),
        };
      },
      () => ({ success: true, data: this.buildStats(this.fallbackTransactions) }),
    );
  }

  async getPaymentMethods(): Promise<Result<PaymentMethod[]>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${WALLET_ENDPOINT}/payment-methods`);
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: [] };
        }
        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizePaymentMethod(item as Partial<PaymentMethod>))
          : [];
        return { ...result, data: list };
      },
      () => ({ success: true, data: this.fallbackPaymentMethods.map((item) => ({ ...item })) }),
    );
  }

  async savePaymentMethod(method: PaymentMethod): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${WALLET_ENDPOINT}/payment-methods/${method.id}`, method);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        const normalized = normalizePaymentMethod(method);
        const next = [...this.fallbackPaymentMethods];
        const index = next.findIndex((item) => item.id === normalized.id);
        if (index >= 0) {
          next[index] = normalized;
        } else {
          next.push(normalized);
        }
        this.persistPaymentMethods(next);
        return { success: true };
      },
    );
  }

  async setDefaultPaymentMethod(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${WALLET_ENDPOINT}/payment-methods/default`, { id });
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        const next = this.fallbackPaymentMethods.map((item) => ({ ...item, isDefault: item.id === id }));
        this.persistPaymentMethods(next);
        return { success: true };
      },
    );
  }

  async transfer(toUserId: string, amount: number, message?: string): Promise<Result<Transaction>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${WALLET_ENDPOINT}/transfer`, {
          toUserId,
          amount,
          message,
        });
        const result = toResult<unknown>(response, undefined);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }
        const transaction = normalizeTransaction(
          ((result.data as Partial<Transaction> | undefined) ?? {
            title: `Transfer to ${toUserId}`,
            amount: -Math.abs(amount),
            category: "Transfer",
            type: "expense",
            description: message,
          }) as Partial<Transaction>,
        );
        return { success: true, data: transaction, message: result.message };
      },
      async () => {
        if (amount <= 0) {
          return { success: false, message: "Transfer amount must be greater than 0." };
        }
        const wallet = this.buildWalletData(this.fallbackTransactions);
        if (wallet.balance < amount) {
          return { success: false, message: "Insufficient balance." };
        }
        return this.addTransaction({
          title: `Transfer to ${toUserId}`,
          amount: -Math.abs(amount),
          category: "Transfer",
          type: "expense",
          description: message,
        });
      },
    );
  }

  async createRedPacket(amount: number, count: number, message: string): Promise<Result<RedPacket>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${WALLET_ENDPOINT}/red-packets`, {
          amount,
          count,
          message,
        });
        const fallbackData: RedPacket = {
          id: createId("red-packet"),
          amount,
          count,
          remainingCount: count,
          message,
          senderId: "current_user",
          senderName: "Current User",
          senderAvatar: undefined,
          expireTime: Date.now() + 24 * 60 * 60 * 1000,
          isReceived: false,
        };
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }
        const data = result.data as Partial<RedPacket>;
        return {
          success: true,
          message: result.message,
          data: {
            id: data.id || fallbackData.id,
            amount: toNumber(data.amount, amount),
            count: toNumber(data.count, count),
            remainingCount: toNumber(data.remainingCount, count),
            message: data.message || message,
            senderId: data.senderId || "current_user",
            senderName: data.senderName || "Current User",
            senderAvatar: data.senderAvatar,
            expireTime: toNumber(data.expireTime, fallbackData.expireTime),
            isReceived: Boolean(data.isReceived),
          },
        };
      },
      async () => {
        if (amount <= 0 || count <= 0) {
          return { success: false, message: "Amount and count must be greater than 0." };
        }
        const wallet = this.buildWalletData(this.fallbackTransactions);
        if (wallet.balance < amount) {
          return { success: false, message: "Insufficient balance." };
        }

        await this.addTransaction({
          title: "Red packet sent",
          amount: -Math.abs(amount),
          category: "Gift",
          type: "expense",
          description: message,
        });

        return {
          success: true,
          data: {
            id: createId("red-packet"),
            amount,
            count,
            remainingCount: count,
            message,
            senderId: "current_user",
            senderName: "Current User",
            senderAvatar: undefined,
            expireTime: Date.now() + 24 * 60 * 60 * 1000,
            isReceived: false,
          },
        };
      },
    );
  }

  getCategories(): string[] {
    return [...fallbackCategories];
  }
}

export const WalletService = new WalletServiceImpl();
