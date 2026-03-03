import { beforeEach, describe, expect, it, vi } from "vitest";

const { initializeSDKMock, destroySDKMock } = vi.hoisted(() => ({
  initializeSDKMock: vi.fn(async () => undefined),
  destroySDKMock: vi.fn(),
}));

vi.mock("@sdkwork/openchat-pc-kernel", () => ({
  IS_DEV: true,
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../packages/sdkwork-openchat-pc-auth/src/services/sdk-adapter", () => ({
  initializeSDK: initializeSDKMock,
  destroySDK: destroySDKMock,
  isSDKInitialized: () => false,
}));

import { loadAuthData, login } from "../../packages/sdkwork-openchat-pc-auth/src/services/auth.service";

describe("Auth service token persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    initializeSDKMock.mockClear();
    destroySDKMock.mockClear();
  });

  it("stores auth token + access token and preserves IM token compatibility", async () => {
    const result = await login("testuser", "Test@123456");

    expect(result.token).toBeTruthy();
    expect(result.imConfig.token).toBeTruthy();
    expect(localStorage.getItem("auth_token")).toBe(result.token);
    expect(localStorage.getItem("access_token")).toBe(result.token);
    expect(localStorage.getItem("token")).toBe(result.imConfig.token);

    const stored = loadAuthData();
    expect(stored?.token).toBe(result.token);
    expect(initializeSDKMock).toHaveBeenCalledTimes(1);
  });
});
