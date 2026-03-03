/**
 * Routing Entry
 *
 * Responsibilities:
 * 1. Define application routes
 * 2. Render route components
 * 3. Apply lazy loading to reduce initial bundle size
 */

import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "./constants";
import { routes } from "./routes";

type RoutePageModule = Record<string, unknown>;
export type RoutePageKey =
  | "chat"
  | "contacts"
  | "terminal"
  | "settings"
  | "agentMarket"
  | "agentDetail"
  | "deviceList"
  | "deviceDetail"
  | "notifications"
  | "mall"
  | "shoppingCart"
  | "moments"
  | "discover"
  | "wallet"
  | "creation"
  | "drive"
  | "shortVideo"
  | "tools"
  | "skillMarket"
  | "mySkills"
  | "skillDetail"
  | "toolMarket"
  | "myTools"
  | "toolConfig"
  | "appStore"
  | "appStoreDetail";

export const routePageLoaders: Record<RoutePageKey, () => Promise<RoutePageModule>> = {
  chat: async () => import("@sdkwork/openchat-pc-im"),
  contacts: async () => import("@sdkwork/openchat-pc-contacts"),
  terminal: async () => import("@sdkwork/openchat-pc-terminal"),
  settings: async () => import("@sdkwork/openchat-pc-settings"),
  agentMarket: async () => import("@sdkwork/openchat-pc-agent"),
  agentDetail: async () => import("@sdkwork/openchat-pc-agent"),
  deviceList: async () => import("@sdkwork/openchat-pc-device"),
  deviceDetail: async () => import("@sdkwork/openchat-pc-device"),
  notifications: async () => import("@sdkwork/openchat-pc-notification"),
  mall: async () => import("@sdkwork/openchat-pc-commerce"),
  shoppingCart: async () => import("@sdkwork/openchat-pc-commerce"),
  moments: async () => import("@sdkwork/openchat-pc-social"),
  discover: async () => import("@sdkwork/openchat-pc-discover"),
  wallet: async () => import("@sdkwork/openchat-pc-wallet"),
  creation: async () => import("@sdkwork/openchat-pc-creation"),
  drive: async () => import("@sdkwork/openchat-pc-drive"),
  shortVideo: async () => import("@sdkwork/openchat-pc-video"),
  tools: async () => import("@sdkwork/openchat-pc-tools"),
  skillMarket: async () => import("@sdkwork/openchat-pc-skill"),
  mySkills: async () => import("@sdkwork/openchat-pc-skill"),
  skillDetail: async () => import("@sdkwork/openchat-pc-skill"),
  toolMarket: async () => import("@sdkwork/openchat-pc-tool"),
  myTools: async () => import("@sdkwork/openchat-pc-tool"),
  toolConfig: async () => import("@sdkwork/openchat-pc-tool"),
  appStore: async () => import("@sdkwork/openchat-pc-appstore"),
  appStoreDetail: async () => import("@sdkwork/openchat-pc-appstore"),
};

export const routePageExportNames: Record<RoutePageKey, string> = {
  chat: "ChatPage",
  contacts: "ContactsPage",
  terminal: "TerminalPage",
  settings: "SettingsPage",
  agentMarket: "AgentMarketPage",
  agentDetail: "AgentDetailPage",
  deviceList: "DeviceListPage",
  deviceDetail: "DeviceDetailPage",
  notifications: "NotificationsPage",
  mall: "MallPage",
  shoppingCart: "ShoppingCartPage",
  moments: "MomentsPage",
  discover: "DiscoverPage",
  wallet: "WalletPage",
  creation: "CreationPage",
  drive: "CloudDrivePage",
  shortVideo: "ShortVideoPage",
  tools: "ToolsPage",
  skillMarket: "SkillMarketPage",
  mySkills: "MySkillsPage",
  skillDetail: "SkillDetailPage",
  toolMarket: "ToolMarketPage",
  myTools: "MyToolsPage",
  toolConfig: "ToolConfigPage",
  appStore: "AppStorePage",
  appStoreDetail: "AppStoreDetailPage",
};

function lazyRoutePage(pageKey: RoutePageKey) {
  return lazy(async () => {
    const module = await routePageLoaders[pageKey]();
    const exportName = routePageExportNames[pageKey];
    const pageComponent = module[exportName];

    if (!pageComponent) {
      throw new Error(
        `[router] Missing page export "${exportName}" for route key "${pageKey}".`,
      );
    }

    return { default: pageComponent as ComponentType };
  });
}

const ChatPage = lazyRoutePage("chat");
const ContactsPage = lazyRoutePage("contacts");
const TerminalPage = lazyRoutePage("terminal");
const SettingsPage = lazyRoutePage("settings");
const AgentMarketPage = lazyRoutePage("agentMarket");
const AgentDetailPage = lazyRoutePage("agentDetail");
const DeviceListPage = lazyRoutePage("deviceList");
const DeviceDetailPage = lazyRoutePage("deviceDetail");
const NotificationsPage = lazyRoutePage("notifications");
const MallPage = lazyRoutePage("mall");
const ShoppingCartPage = lazyRoutePage("shoppingCart");
const MomentsPage = lazyRoutePage("moments");
const DiscoverPage = lazyRoutePage("discover");
const WalletPage = lazyRoutePage("wallet");
const CreationPage = lazyRoutePage("creation");
const CloudDrivePage = lazyRoutePage("drive");
const ShortVideoPage = lazyRoutePage("shortVideo");
const ToolsPage = lazyRoutePage("tools");
const SkillMarketPage = lazyRoutePage("skillMarket");
const MySkillsPage = lazyRoutePage("mySkills");
const SkillDetailPage = lazyRoutePage("skillDetail");
const ToolMarketPage = lazyRoutePage("toolMarket");
const MyToolsPage = lazyRoutePage("myTools");
const ToolConfigPage = lazyRoutePage("toolConfig");
const AppStorePage = lazyRoutePage("appStore");
const AppStoreDetailPage = lazyRoutePage("appStoreDetail");

function RouteLoading() {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center bg-bg-primary">
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading page...
      </div>
    </div>
  );
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Unknown route error",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[router] route render failed:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      errorMessage: "",
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 bg-bg-primary px-6 text-center">
          <div className="text-base font-medium text-text-primary">Page failed to render</div>
          <div className="max-w-xl text-sm text-text-secondary">
            {this.state.errorMessage || "An unexpected route error occurred."}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(ROUTES.CHAT)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:brightness-110"
            >
              Back to Chat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function withSuspense(node: ReactNode): ReactNode {
  return (
    <div data-testid="route-shell" className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <RouteErrorBoundary>
        <Suspense fallback={<RouteLoading />}>{node}</Suspense>
      </RouteErrorBoundary>
    </div>
  );
}

/**
 * Application router component
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.CHAT} replace />} />

      <Route path={`${ROUTES.CHAT}/*`} element={withSuspense(<ChatPage />)} />
      <Route path={`${ROUTES.CONTACTS}/*`} element={withSuspense(<ContactsPage />)} />
      <Route path={`${ROUTES.TERMINAL}/*`} element={withSuspense(<TerminalPage />)} />
      <Route path={`${ROUTES.SETTINGS}/*`} element={withSuspense(<SettingsPage />)} />

      <Route path={ROUTES.AGENTS} element={withSuspense(<AgentMarketPage />)} />
      <Route path={ROUTES.AGENT_DETAIL} element={withSuspense(<AgentDetailPage />)} />

      <Route path={ROUTES.SKILLS} element={withSuspense(<SkillMarketPage />)} />
      <Route path={ROUTES.MY_SKILLS} element={withSuspense(<MySkillsPage />)} />
      <Route path={ROUTES.SKILL_DETAIL} element={withSuspense(<SkillDetailPage />)} />

      <Route path={ROUTES.TOOL_MARKET} element={withSuspense(<ToolMarketPage />)} />
      <Route path={ROUTES.MY_TOOLS} element={withSuspense(<MyToolsPage />)} />
      <Route path={ROUTES.TOOL_CONFIG} element={withSuspense(<ToolConfigPage />)} />

      <Route path={ROUTES.DEVICES} element={withSuspense(<DeviceListPage />)} />
      <Route path={ROUTES.DEVICE_DETAIL} element={withSuspense(<DeviceDetailPage />)} />

      <Route path={ROUTES.NOTIFICATIONS} element={withSuspense(<NotificationsPage />)} />

      <Route path={ROUTES.COMMERCE_MALL} element={withSuspense(<MallPage />)} />
      <Route path={ROUTES.COMMERCE_CART} element={withSuspense(<ShoppingCartPage />)} />

      <Route path={ROUTES.MOMENTS} element={withSuspense(<MomentsPage />)} />
      <Route path={ROUTES.DISCOVER} element={withSuspense(<DiscoverPage />)} />
      <Route path={ROUTES.WALLET} element={withSuspense(<WalletPage />)} />
      <Route path={ROUTES.CREATION} element={withSuspense(<CreationPage />)} />
      <Route path={ROUTES.DRIVE} element={withSuspense(<CloudDrivePage />)} />
      <Route path={ROUTES.SHORT_VIDEO} element={withSuspense(<ShortVideoPage />)} />
      <Route path={ROUTES.TOOLS} element={withSuspense(<ToolsPage />)} />
      <Route path={ROUTES.APPSTORE} element={withSuspense(<AppStorePage />)} />
      <Route path={ROUTES.APPSTORE_DETAIL} element={withSuspense(<AppStoreDetailPage />)} />

      <Route path="*" element={<Navigate to={ROUTES.CHAT} replace />} />
    </Routes>
  );
}

export { routes };
export { ROUTES, ROUTE_NAMES, type RouteMeta } from "./constants";
export { authGuard, permissionGuard, executeGuards } from "./guards";

export default AppRouter;
