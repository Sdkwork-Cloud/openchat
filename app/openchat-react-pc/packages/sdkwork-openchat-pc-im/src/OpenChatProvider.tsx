import { type ReactNode, useEffect, useMemo, useState } from "react";
import { SDKProvider } from "./components/SDKProvider";
import type { SDKAdapterConfig } from "./adapters/sdk-adapter";

const IM_CONFIG_STORAGE_KEY = "openchat:im-config";
const IM_CONFIG_EVENT = "openchat:im-config-updated";

interface StoredIMConfig {
  wsUrl?: string;
  serverUrl?: string;
  deviceId?: string;
  deviceFlag?: string;
  uid?: string;
  token?: string;
}

function parseStoredIMConfig(): StoredIMConfig {
  try {
    const raw = localStorage.getItem(IM_CONFIG_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as StoredIMConfig;
  } catch (error) {
    console.warn("Failed to parse IM config from localStorage.", error);
    return {};
  }
}

function toSDKConfig(): SDKAdapterConfig | null {
  const stored = parseStoredIMConfig();
  const envWsUrl =
    (import.meta.env.VITE_IM_WS_URL as string | undefined) ??
    (import.meta.env.VITE_APP_IM_WS_URL as string | undefined) ??
    "";
  const envApiBaseUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.VITE_APP_API_BASE_URL as string | undefined) ??
    "http://localhost:3000";

  const imWsUrl = (stored.wsUrl ?? envWsUrl).trim();
  const apiBaseUrl = (stored.serverUrl ?? envApiBaseUrl).trim();
  const uid = (stored.uid ?? localStorage.getItem("uid") ?? "").trim();
  const token = (stored.token ?? localStorage.getItem("token") ?? "").trim();
  const deviceId = stored.deviceId?.trim() || undefined;

  if (!imWsUrl || !uid || !token) {
    return null;
  }

  return {
    apiBaseUrl,
    imWsUrl,
    uid,
    token,
    deviceId,
  };
}

function buildConfigKey(config: SDKAdapterConfig): string {
  return [config.apiBaseUrl, config.imWsUrl, config.uid, config.token, config.deviceId ?? ""].join(
    "::",
  );
}

export function OpenChatProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SDKAdapterConfig | null>(() => toSDKConfig());

  useEffect(() => {
    const refreshConfig = () => {
      setConfig(toSDKConfig());
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === IM_CONFIG_STORAGE_KEY ||
        event.key === "uid" ||
        event.key === "token" ||
        event.key === null
      ) {
        refreshConfig();
      }
    };

    const handleConfigEvent = () => {
      refreshConfig();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(IM_CONFIG_EVENT, handleConfigEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(IM_CONFIG_EVENT, handleConfigEvent);
    };
  }, []);

  const configKey = useMemo(() => (config ? buildConfigKey(config) : "sdk-disabled"), [config]);

  if (!config) {
    return <>{children}</>;
  }

  return (
    <SDKProvider key={configKey} config={config}>
      {children}
    </SDKProvider>
  );
}
