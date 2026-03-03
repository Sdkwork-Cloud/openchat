import type { SDKAdapterBridge } from "../types/contracts/service-contracts";

export interface SDKAdapterRegistry<TAdapter extends SDKAdapterBridge> {
  registerSDKAdapter: (adapter: TAdapter) => void;
  getSDKAdapter: () => TAdapter | null;
}

export function createSDKAdapterRegistry<TAdapter extends SDKAdapterBridge>(): SDKAdapterRegistry<TAdapter> {
  let sdkAdapter: TAdapter | null = null;

  return {
    registerSDKAdapter(adapter: TAdapter): void {
      sdkAdapter = adapter;
    },
    getSDKAdapter(): TAdapter | null {
      return sdkAdapter;
    },
  };
}
