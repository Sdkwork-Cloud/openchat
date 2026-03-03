import type { Transaction, TransactionType } from "../types";

export type WalletWorkspaceSort = "new" | "amount";

export interface WalletWorkspaceSummary {
  total: number;
  income: number;
  expense: number;
  pending: number;
  completed: number;
  failed: number;
}

export interface WalletWorkspaceLibrary {
  favorites: Transaction[];
  recent: Transaction[];
  highValue: Transaction[];
}

export interface WalletWorkspaceFilterInput {
  keyword?: string;
  type?: "all" | TransactionType;
  category?: string;
  sortBy?: WalletWorkspaceSort;
}

interface BuildWalletWorkspaceLibraryInput {
  favoriteTransactionIds: string[];
  recentTransactionIds: string[];
  maxHighValueCount?: number;
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    result.push(id);
  });

  return result;
}

export function buildWalletWorkspaceSummary(transactions: Transaction[]): WalletWorkspaceSummary {
  return transactions.reduce<WalletWorkspaceSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.type === "income") {
        summary.income += Math.abs(item.amount);
      } else {
        summary.expense += Math.abs(item.amount);
      }

      if (item.status === "pending") {
        summary.pending += 1;
      } else if (item.status === "failed") {
        summary.failed += 1;
      } else {
        summary.completed += 1;
      }

      return summary;
    },
    {
      total: 0,
      income: 0,
      expense: 0,
      pending: 0,
      completed: 0,
      failed: 0,
    },
  );
}

export function filterWalletWorkspaceTransactions(
  transactions: Transaction[],
  input: WalletWorkspaceFilterInput,
): Transaction[] {
  const keyword = input.keyword?.trim().toLowerCase() || "";
  const type = input.type || "all";
  const category = input.category || "all";
  const sortBy = input.sortBy || "new";

  let list = [...transactions];

  if (keyword) {
    list = list.filter((item) => {
      const target = `${item.title} ${item.category} ${item.description || ""}`.toLowerCase();
      return target.includes(keyword);
    });
  }

  if (type !== "all") {
    list = list.filter((item) => item.type === type);
  }

  if (category !== "all") {
    list = list.filter((item) => item.category === category);
  }

  if (sortBy === "amount") {
    list.sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount));
  } else {
    list.sort((left, right) => (right.createTime || 0) - (left.createTime || 0));
  }

  return list;
}

export function buildWalletWorkspaceLibrary(
  transactions: Transaction[],
  input: BuildWalletWorkspaceLibraryInput,
): WalletWorkspaceLibrary {
  const map = new Map(transactions.map((item) => [item.id, item]));
  const maxHighValueCount = input.maxHighValueCount ?? 6;

  const favorites = uniqueIds(input.favoriteTransactionIds)
    .map((transactionId) => map.get(transactionId))
    .filter((item): item is Transaction => Boolean(item));

  const recent = uniqueIds(input.recentTransactionIds)
    .map((transactionId) => map.get(transactionId))
    .filter((item): item is Transaction => Boolean(item));

  const highValue = [...transactions]
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, maxHighValueCount);

  return {
    favorites,
    recent,
    highValue,
  };
}
