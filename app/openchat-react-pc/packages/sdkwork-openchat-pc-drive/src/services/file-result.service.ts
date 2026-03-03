import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { FileService } from "./FileService";

export const FileResultService = createServiceResultProxy(FileService, {
  source: "local",
  fallbackMessage: "Drive service request failed.",
});
