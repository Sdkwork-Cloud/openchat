/**
 * Lightweight SDK adapter used by auth service.
 *
 * Note:
 * - Keep auth package independent from IM package internals.
 * - Real IM bootstrap is handled by app-level provider/openchat runtime.
 */

import { createSDKAdapterRegistry, type SDKAdapterBridge as BaseSDKAdapterBridge } from "@sdkwork/openchat-pc-contracts";

export interface InitializeSDKParams {
  apiBaseUrl: string;
  imWsUrl: string;
  uid: string;
  token: string;
}

export interface SDKAdapterBridge extends BaseSDKAdapterBridge {
  initialize?(params: InitializeSDKParams): Promise<void> | void;
  destroy?(): Promise<void> | void;
}

const { registerSDKAdapter, getSDKAdapter } = createSDKAdapterRegistry<SDKAdapterBridge>();

export { getSDKAdapter, registerSDKAdapter };

let sdkInitialized = false;

export async function initializeSDK(params: InitializeSDKParams): Promise<void> {
  const adapter = getSDKAdapter();
  if (adapter?.isAvailable()) {
    if (adapter.initialize) {
      await adapter.initialize(params);
      sdkInitialized = true;
      return;
    }
    if (adapter.invoke) {
      await adapter.invoke("initializeSDK", params);
      sdkInitialized = true;
      return;
    }
  }

  sdkInitialized = true;
}

export function destroySDK(): void {
  const adapter = getSDKAdapter();
  if (adapter?.isAvailable()) {
    try {
      if (adapter.destroy) {
        const maybePromise = adapter.destroy();
        if (maybePromise instanceof Promise) {
          void maybePromise;
        }
      } else if (adapter.invoke) {
        void adapter.invoke("destroySDK");
      }
    } catch {
      // Keep backward-compatible local teardown semantics.
    }
  }

  sdkInitialized = false;
}

export function isSDKInitialized(): boolean {
  return sdkInitialized;
}
