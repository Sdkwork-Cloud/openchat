import { describe, expect, it } from "vitest";
import type { Transaction } from "../../packages/sdkwork-openchat-pc-wallet/src/types";
import {
  buildWalletWorkspaceLibrary,
  buildWalletWorkspaceSummary,
  filterWalletWorkspaceTransactions,
} from "../../packages/sdkwork-openchat-pc-wallet/src/pages/wallet.workspace.model";

function createTransaction(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id || "tx-default",
    title: partial.title || "Transaction",
    amount: partial.amount ?? 0,
    category: partial.category || "General",
    type: partial.type || "income",
    status: partial.status || "completed",
    description: partial.description,
    relatedId: partial.relatedId,
    paymentMethod: partial.paymentMethod,
    createTime: partial.createTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
    updateTime: partial.updateTime ?? Date.parse("2026-01-01T00:00:00.000Z"),
  };
}

const transactions: Transaction[] = [
  createTransaction({
    id: "tx-a",
    title: "Salary payout",
    amount: 12000,
    category: "Salary",
    type: "income",
    status: "completed",
    createTime: Date.parse("2026-02-10T00:00:00.000Z"),
  }),
  createTransaction({
    id: "tx-b",
    title: "Cloud subscription",
    amount: -360,
    category: "Subscription",
    type: "expense",
    status: "pending",
    createTime: Date.parse("2026-02-12T00:00:00.000Z"),
  }),
  createTransaction({
    id: "tx-c",
    title: "Team lunch reimbursement",
    amount: 88,
    category: "Transfer",
    type: "income",
    status: "failed",
    createTime: Date.parse("2026-02-11T00:00:00.000Z"),
  }),
];

describe("wallet workspace model", () => {
  it("builds wallet workspace summary", () => {
    const summary = buildWalletWorkspaceSummary(transactions);

    expect(summary.total).toBe(3);
    expect(summary.income).toBe(12088);
    expect(summary.expense).toBe(360);
    expect(summary.pending).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.completed).toBe(1);
  });

  it("filters transactions with keyword and type", () => {
    const filtered = filterWalletWorkspaceTransactions(transactions, {
      keyword: "subscription",
      type: "expense",
      category: "all",
      sortBy: "new",
    });

    expect(filtered.map((item) => item.id)).toEqual(["tx-b"]);
  });

  it("builds favorites/recent/highValue libraries", () => {
    const library = buildWalletWorkspaceLibrary(transactions, {
      favoriteTransactionIds: ["tx-c", "tx-a", "unknown"],
      recentTransactionIds: ["tx-b", "tx-c", "missing"],
    });

    expect(library.favorites.map((item) => item.id)).toEqual(["tx-c", "tx-a"]);
    expect(library.recent.map((item) => item.id)).toEqual(["tx-b", "tx-c"]);
    expect(library.highValue[0]?.id).toBe("tx-a");
  });
});
