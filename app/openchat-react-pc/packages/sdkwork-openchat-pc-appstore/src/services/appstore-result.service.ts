import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import * as appstoreService from "./appstore.service";

export const AppstoreResultService = createServiceResultProxy(appstoreService, {
  source: "http-or-mock",
  fallbackMessage: "Appstore service request failed.",
});
