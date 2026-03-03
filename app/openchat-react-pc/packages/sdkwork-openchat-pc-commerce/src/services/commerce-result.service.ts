import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { CartService } from "./CartService";
import { CommerceService } from "./CommerceService";

export const CartResultService = createServiceResultProxy(CartService, {
  source: "http-or-mock",
  fallbackMessage: "Cart service request failed.",
});

export const CommerceResultService = createServiceResultProxy(CommerceService, {
  source: "http-or-mock",
  fallbackMessage: "Commerce service request failed.",
});
