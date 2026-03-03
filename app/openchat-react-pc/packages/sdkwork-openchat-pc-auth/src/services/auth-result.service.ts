import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import * as authService from "./auth.service";

export const AuthResultService = createServiceResultProxy(authService, {
  source: "http-or-mock",
  fallbackMessage: "Auth service request failed.",
});
