import { useEffect, useMemo, useState } from "react";
import { WalletResultService, WalletService } from "../services";
import type {
  PaymentMethod,
  Transaction,
  TransactionType,
  WalletData,
  WalletStats,
} from "../types";
import {
  buildWalletWorkspaceLibrary,
  buildWalletWorkspaceSummary,
  filterWalletWorkspaceTransactions,
} from "./wallet.workspace.model";

function formatCurrency(value: number, currency = "CNY"): string {
  return `${currency} ${value.toFixed(2)}`;
}

function formatTime(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

function formatStatus(status: Transaction["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    default:
      return "Completed";
  }
}

export function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [favoriteTransactionIds, setFavoriteTransactionIds] = useState<string[]>(() =>
    WalletService.getFavoriteTransactionIds(),
  );
  const [recentTransactionIds, setRecentTransactionIds] = useState<string[]>(() =>
    WalletService.getRecentTransactionIds(),
  );

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [transferName, setTransferName] = useState("Teammate");
  const [transferAmount, setTransferAmount] = useState("100");
  const [transferMessage, setTransferMessage] = useState("Team expense reimbursement");

  const [redPacketAmount, setRedPacketAmount] = useState("50");
  const [redPacketCount, setRedPacketCount] = useState("5");
  const [redPacketMessage, setRedPacketMessage] = useState("Team bonus");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const categories = useMemo(() => WalletService.getCategories(), []);

  const loadData = async () => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const transactionFilter: { type?: TransactionType; category?: string } = {};
      if (typeFilter !== "all") {
        transactionFilter.type = typeFilter;
      }
      if (categoryFilter !== "all") {
        transactionFilter.category = categoryFilter;
      }

      const [walletRes, transactionsRes, statsRes, paymentRes] = await Promise.all([
        WalletResultService.getWalletData(),
        WalletResultService.getTransactions(transactionFilter, 1, 60),
        WalletResultService.getStats(),
        WalletResultService.getPaymentMethods(),
      ]);

      setWalletData(walletRes.data || null);
      setTransactions(transactionsRes.data?.content || []);
      setStats(statsRes.data || null);
      setPaymentMethods(paymentRes.data || []);

      if (!walletRes.success || !transactionsRes.success || !statsRes.success || !paymentRes.success) {
        setErrorText(
          walletRes.message ||
            transactionsRes.message ||
            statsRes.message ||
            paymentRes.message ||
            "Some wallet data could not be loaded.",
        );
      }
    } catch (error) {
      setWalletData(null);
      setTransactions([]);
      setStats(null);
      setPaymentMethods([]);
      setErrorText(error instanceof Error ? error.message : "Failed to load wallet data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [typeFilter, categoryFilter]);

  const workspaceTransactions = useMemo(
    () =>
      filterWalletWorkspaceTransactions(transactions, {
        keyword,
        type: typeFilter,
        category: categoryFilter,
        sortBy: "new",
      }),
    [transactions, keyword, typeFilter, categoryFilter],
  );

  const workspaceSummary = useMemo(
    () => buildWalletWorkspaceSummary(workspaceTransactions),
    [workspaceTransactions],
  );

  const workspaceLibrary = useMemo(
    () =>
      buildWalletWorkspaceLibrary(transactions, {
        favoriteTransactionIds,
        recentTransactionIds,
      }),
    [transactions, favoriteTransactionIds, recentTransactionIds],
  );

  const favoriteSet = useMemo(() => new Set(favoriteTransactionIds), [favoriteTransactionIds]);

  useEffect(() => {
    if (workspaceTransactions.length === 0) {
      setSelectedTransactionId(null);
      return;
    }
    if (!selectedTransactionId || !workspaceTransactions.some((item) => item.id === selectedTransactionId)) {
      const nextId = workspaceTransactions[0].id;
      setSelectedTransactionId(nextId);
      setRecentTransactionIds(WalletService.markTransactionOpened(nextId));
    }
  }, [workspaceTransactions, selectedTransactionId]);

  const selectedTransaction = useMemo(
    () => transactions.find((item) => item.id === selectedTransactionId) || null,
    [transactions, selectedTransactionId],
  );

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setRecentTransactionIds(WalletService.markTransactionOpened(transactionId));
  };

  const handleToggleFavorite = (transactionId: string) => {
    WalletService.toggleFavoriteTransaction(transactionId);
    setFavoriteTransactionIds(WalletService.getFavoriteTransactionIds());
  };

  const handleTransfer = async () => {
    const amount = Number(transferAmount);
    if (!transferName.trim() || Number.isNaN(amount) || amount <= 0) {
      setStatusText("Provide a valid recipient and amount.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("");
    try {
      const result = await WalletResultService.transfer(
        transferName.trim(),
        amount,
        transferMessage.trim() || undefined,
      );
      if (!result.success) {
        setStatusText(result.message || "Transfer failed.");
        return;
      }
      setStatusText("Transfer completed.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRedPacket = async () => {
    const amount = Number(redPacketAmount);
    const count = Number(redPacketCount);
    if (Number.isNaN(amount) || amount <= 0 || Number.isNaN(count) || count <= 0) {
      setStatusText("Provide valid red packet amount and count.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("");
    try {
      const result = await WalletResultService.createRedPacket(
        amount,
        count,
        redPacketMessage.trim() || "Team bonus",
      );
      if (!result.success) {
        setStatusText(result.message || "Failed to create red packet.");
        return;
      }
      setStatusText(`Red packet created: ${formatCurrency(result.data?.amount || amount)}`);
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to create red packet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefaultMethod = async (id: string) => {
    setStatusText("");
    try {
      const result = await WalletResultService.setDefaultPaymentMethod(id);
      if (!result.success) {
        setStatusText(result.message || "Failed to update default payment method.");
        return;
      }
      setStatusText("Default payment method updated.");
      await loadData();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to update default payment method.");
    }
  };

  const currency = walletData?.currency || "CNY";

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Wallet</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Operate transfers and payment methods while reviewing transactions in a dedicated workspace.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[540px] gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary">Transactions</h2>
              <p className="mt-1 text-xs text-text-secondary">Filter and select records for detail review.</p>
              <div className="mt-3 space-y-2">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Search title, category, description"
                  className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as "all" | TransactionType)}
                    className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="all">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
              <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                <p className="text-[11px] text-text-muted">Records</p>
                <p className="text-sm font-semibold text-text-primary">{workspaceSummary.total}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                <p className="text-[11px] text-text-muted">Income</p>
                <p className="text-sm font-semibold text-success">{formatCurrency(workspaceSummary.income, currency)}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5">
                <p className="text-[11px] text-text-muted">Expense</p>
                <p className="text-sm font-semibold text-error">{formatCurrency(workspaceSummary.expense, currency)}</p>
              </div>
            </div>

            <div className="border-b border-border px-3 py-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-primary">Favorites</p>
                    <span className="text-[11px] text-text-muted">{workspaceLibrary.favorites.length}</span>
                  </div>
                  <div className="space-y-1">
                    {workspaceLibrary.favorites.slice(0, 2).map((item) => (
                      <button
                        key={`wallet-favorite-${item.id}`}
                        onClick={() => handleSelectTransaction(item.id)}
                        className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                      >
                        {item.title}
                      </button>
                    ))}
                    {workspaceLibrary.favorites.length === 0 ? (
                      <p className="text-[11px] text-text-muted">No favorites yet.</p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-primary">Recent Opened</p>
                    <span className="text-[11px] text-text-muted">{workspaceLibrary.recent.length}</span>
                  </div>
                  <div className="space-y-1">
                    {workspaceLibrary.recent.slice(0, 2).map((item) => (
                      <button
                        key={`wallet-recent-${item.id}`}
                        onClick={() => handleSelectTransaction(item.id)}
                        className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-left text-[11px] text-text-secondary hover:bg-bg-hover"
                      >
                        {item.title}
                      </button>
                    ))}
                    {workspaceLibrary.recent.length === 0 ? (
                      <p className="text-[11px] text-text-muted">No recent history.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-text-secondary">Loading wallet transactions...</div>
              ) : workspaceTransactions.length === 0 ? (
                <div className="p-4 text-sm text-text-secondary">No transactions found.</div>
              ) : (
                <div className="divide-y divide-border">
                  {workspaceTransactions.map((item) => {
                    const selected = item.id === selectedTransactionId;
                    const amountClass = item.type === "income" ? "text-success" : "text-error";
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTransaction(item.id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          selected ? "bg-primary-soft/25" : "hover:bg-bg-hover"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.title}</p>
                            {favoriteSet.has(item.id) ? (
                              <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                Fav
                              </span>
                            ) : null}
                          </div>
                          <p className={`text-xs font-semibold ${amountClass}`}>
                            {item.amount >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(item.amount), currency)}
                          </p>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-text-muted">
                          {item.category} | {formatTime(item.createTime)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-xs text-text-muted">Available Balance</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">
                    {walletData ? formatCurrency(walletData.balance, currency) : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-xs text-text-muted">Frozen</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">
                    {walletData ? formatCurrency(walletData.frozen, currency) : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-xs text-text-muted">Today Income</p>
                  <p className="mt-1 text-lg font-semibold text-success">
                    {walletData ? formatCurrency(walletData.dailyIncome, currency) : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                  <p className="text-xs text-text-muted">Monthly Expense</p>
                  <p className="mt-1 text-lg font-semibold text-error">
                    {walletData ? formatCurrency(walletData.monthlyExpense, currency) : "-"}
                  </p>
                </div>
              </div>

              {statusText ? <p className="mt-3 text-sm text-text-secondary">{statusText}</p> : null}
              {errorText ? (
                <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                  {errorText}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 p-4">
              <div className="grid h-full min-h-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-auto space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-bg-primary p-4">
                      <h3 className="text-sm font-semibold text-text-primary">Transfer</h3>
                      <div className="mt-3 space-y-2">
                        <input
                          value={transferName}
                          onChange={(event) => setTransferName(event.target.value)}
                          placeholder="Recipient"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <input
                          value={transferAmount}
                          onChange={(event) => setTransferAmount(event.target.value)}
                          placeholder="Amount"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <input
                          value={transferMessage}
                          onChange={(event) => setTransferMessage(event.target.value)}
                          placeholder="Message"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <button
                          onClick={() => void handleTransfer()}
                          disabled={isSubmitting}
                          className="w-full rounded-md bg-primary px-3 py-2 text-xs text-white disabled:opacity-60"
                        >
                          Send Transfer
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-bg-primary p-4">
                      <h3 className="text-sm font-semibold text-text-primary">Red Packet</h3>
                      <div className="mt-3 space-y-2">
                        <input
                          value={redPacketAmount}
                          onChange={(event) => setRedPacketAmount(event.target.value)}
                          placeholder="Total amount"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <input
                          value={redPacketCount}
                          onChange={(event) => setRedPacketCount(event.target.value)}
                          placeholder="Count"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <input
                          value={redPacketMessage}
                          onChange={(event) => setRedPacketMessage(event.target.value)}
                          placeholder="Greeting"
                          className="h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                        />
                        <button
                          onClick={() => void handleCreateRedPacket()}
                          disabled={isSubmitting}
                          className="w-full rounded-md bg-warning px-3 py-2 text-xs text-white disabled:opacity-60"
                        >
                          Create Red Packet
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-bg-primary p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-text-primary">Payment Methods</h3>
                      <span className="text-xs text-text-muted">{paymentMethods.length} methods</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {paymentMethods.length === 0 ? (
                        <p className="text-xs text-text-muted">No payment methods available.</p>
                      ) : (
                        paymentMethods.map((method) => (
                          <div key={method.id} className="rounded-md border border-border bg-bg-secondary p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-text-primary">
                                  {method.icon} {method.name}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {method.type}
                                  {method.last4 ? ` | **** ${method.last4}` : ""}
                                </p>
                              </div>
                              <button
                                onClick={() => void handleSetDefaultMethod(method.id)}
                                className={`rounded px-2.5 py-1 text-[11px] ${
                                  method.isDefault
                                    ? "bg-success/20 text-success"
                                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                                }`}
                              >
                                {method.isDefault ? "Default" : "Set Default"}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-bg-primary">
                  <div className="border-b border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">Transaction Detail</h3>
                      {selectedTransaction ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(selectedTransaction.id)}
                          className={`rounded border px-2 py-1 text-[11px] ${
                            favoriteSet.has(selectedTransaction.id)
                              ? "border-warning/40 bg-warning/20 text-warning"
                              : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                          }`}
                        >
                          {favoriteSet.has(selectedTransaction.id) ? "Favorited" : "Favorite"}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedTransaction ? "Selected record details and diagnostics." : "Select one record on the left."}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    {selectedTransaction ? (
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-text-muted">Title</p>
                          <p className="mt-1 font-medium text-text-primary">{selectedTransaction.title}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Amount</p>
                          <p
                            className={`mt-1 font-semibold ${
                              selectedTransaction.type === "income" ? "text-success" : "text-error"
                            }`}
                          >
                            {selectedTransaction.amount >= 0 ? "+" : "-"}
                            {formatCurrency(Math.abs(selectedTransaction.amount), currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Category</p>
                          <p className="mt-1 text-text-primary">{selectedTransaction.category}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Status</p>
                          <p className="mt-1 text-text-primary">{formatStatus(selectedTransaction.status)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Created At</p>
                          <p className="mt-1 text-text-primary">{formatTime(selectedTransaction.createTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Description</p>
                          <p className="mt-1 whitespace-pre-wrap text-text-secondary">
                            {selectedTransaction.description || "No description."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-text-muted">
                        No transaction selected.
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Global Stats</h4>
                    <div className="mt-2 space-y-2 text-xs">
                      <p className="text-text-secondary">
                        Total Income:{" "}
                        <span className="font-semibold text-success">
                          {formatCurrency(stats?.totalIncome || 0, currency)}
                        </span>
                      </p>
                      <p className="text-text-secondary">
                        Total Expense:{" "}
                        <span className="font-semibold text-error">
                          {formatCurrency(stats?.totalExpense || 0, currency)}
                        </span>
                      </p>
                      <p className="text-text-secondary">
                        Transactions: <span className="font-semibold text-text-primary">{stats?.transactionCount || 0}</span>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default WalletPage;
