import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import SearchService from "./SearchService";

export const SearchResultService = createServiceResultProxy(SearchService, {
  source: "http-or-mock",
  fallbackMessage: "Search service request failed.",
});
