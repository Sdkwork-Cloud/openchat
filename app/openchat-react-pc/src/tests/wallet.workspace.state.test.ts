import { beforeEach, describe, expect, it } from "vitest";
import { WalletService } from "../../packages/sdkwork-openchat-pc-wallet/src/services/WalletService";

describe("wallet workspace state", () => {
  beforeEach(() => {
    WalletService.resetWorkspaceState();
  });

  it("toggles favorite transactions", () => {
    const transactionId = `wallet-favorite-${Date.now()}`;

    const enabled = WalletService.toggleFavoriteTransaction(transactionId);
    expect(enabled).toBe(true);
    expect(WalletService.isTransactionFavorite(transactionId)).toBe(true);

    const disabled = WalletService.toggleFavoriteTransaction(transactionId);
    expect(disabled).toBe(false);
    expect(WalletService.isTransactionFavorite(transactionId)).toBe(false);
  });

  it("keeps recent opened transaction order", () => {
    const first = `wallet-recent-a-${Date.now()}`;
    const second = `wallet-recent-b-${Date.now()}`;

    WalletService.markTransactionOpened(first);
    const order = WalletService.markTransactionOpened(second);
    const reordered = WalletService.markTransactionOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
