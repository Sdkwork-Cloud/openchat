import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { WalletService } from "./WalletService";

export const WalletResultService = createServiceResultProxy(WalletService, {
  source: "http-or-mock",
  fallbackMessage: "Wallet service request failed.",
});
