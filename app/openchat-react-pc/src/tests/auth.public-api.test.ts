import { describe, expect, it } from "vitest";
import { useAuth as ExportedUseAuth } from "@sdkwork/openchat-pc-auth";
import { useAuth as ServiceUseAuth } from "../../packages/sdkwork-openchat-pc-auth/src/hooks/useAuth";

describe("Auth package public API", () => {
  it("exports the service-backed useAuth hook", () => {
    expect(ExportedUseAuth).toBe(ServiceUseAuth);
  });
});
