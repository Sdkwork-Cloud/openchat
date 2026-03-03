import { createSDKAdapterRegistry, type SDKAdapterBridge as BaseSDKAdapterBridge } from "@sdkwork/openchat-pc-contracts";

/**
 * SDK adapter reservation for progressive service integration.
 */
export interface SDKAdapterBridge extends BaseSDKAdapterBridge {}

const { registerSDKAdapter, getSDKAdapter } = createSDKAdapterRegistry<SDKAdapterBridge>();

export { getSDKAdapter, registerSDKAdapter };
