import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import DiscoverService from "./DiscoverService";

export const DiscoverResultService = createServiceResultProxy(DiscoverService, {
  source: "http-or-mock",
  fallbackMessage: "Discover service request failed.",
});
