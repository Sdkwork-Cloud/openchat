import type { ReactNode } from "react";
import { ROUTES } from "./constants";
import type { RouteMeta } from "./constants";

export interface AppRouteObject {
  path: string;
  element?: ReactNode;
  meta?: RouteMeta;
  children?: AppRouteObject[];
}

export const routes: AppRouteObject[] = [
  {
    path: ROUTES.HOME,
    element: null,
    meta: { title: "Home", hiddenInMenu: true },
  },
  {
    path: ROUTES.CHAT,
    element: null,
    meta: { title: "Chat", icon: "chat", keepAlive: true },
  },
  {
    path: ROUTES.CONTACTS,
    element: null,
    meta: { title: "Contacts", icon: "contacts", keepAlive: true },
  },
  {
    path: ROUTES.AGENTS,
    element: null,
    meta: { title: "Agent Market", icon: "agents", keepAlive: true },
  },
  {
    path: ROUTES.SKILLS,
    element: null,
    meta: { title: "Skill Market", icon: "skills", keepAlive: true },
  },
  {
    path: ROUTES.APPSTORE,
    element: null,
    meta: { title: "App Store", icon: "appstore", keepAlive: true },
  },
  {
    path: ROUTES.DEVICES,
    element: null,
    meta: { title: "Devices", icon: "devices", keepAlive: true },
  },
  {
    path: ROUTES.TERMINAL,
    element: null,
    meta: { title: "Terminal", icon: "terminal", keepAlive: false },
  },
  {
    path: ROUTES.SETTINGS,
    element: null,
    meta: { title: "Settings", icon: "settings", keepAlive: true },
  },
  {
    path: ROUTES.NOT_FOUND,
    element: null,
    meta: { title: "Not Found", hiddenInMenu: true },
  },
];

export function getRouteMeta(path: string): RouteMeta | undefined {
  return routes.find((route) => route.path === path)?.meta;
}

export function getPageTitle(path: string): string {
  return getRouteMeta(path)?.title || "OpenChat";
}

export default routes;
