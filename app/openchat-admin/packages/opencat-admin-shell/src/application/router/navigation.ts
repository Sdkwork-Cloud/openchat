import type { LucideIcon } from 'lucide-react';
import {
  Cpu,
  LayoutDashboard,
  MessageSquare,
  RadioTower,
  ServerCog,
  Settings2,
  UserCog,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { ROUTE_PATHS } from './routePaths';

export interface NavigationItem {
  id: string;
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  section: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    section: 'Command Center',
    items: [
      {
        id: 'overview',
        to: ROUTE_PATHS.OVERVIEW,
        label: 'Overview',
        description: 'KPIs, runtime posture and recent operations',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: 'Identity',
    items: [
      {
        id: 'users',
        to: ROUTE_PATHS.USERS,
        label: 'Users',
        description: 'Lifecycle, roles and device session controls',
        icon: UserCog,
      },
      {
        id: 'groups',
        to: ROUTE_PATHS.GROUPS,
        label: 'Groups',
        description: 'Membership, mute, owner transfer and moderation',
        icon: Users,
      },
      {
        id: 'friends',
        to: ROUTE_PATHS.FRIENDS,
        label: 'Friends',
        description: 'Friend graph review, blocks and requests',
        icon: UserRoundCheck,
      },
    ],
  },
  {
    section: 'Content',
    items: [
      {
        id: 'messages',
        to: ROUTE_PATHS.MESSAGES,
        label: 'Messages',
        description: 'Recall, delete and inspect moderation targets',
        icon: MessageSquare,
      },
    ],
  },
  {
    section: 'Infrastructure',
    items: [
      {
        id: 'iot',
        to: ROUTE_PATHS.IOT,
        label: 'IoT',
        description: 'Fleet state, command dispatch and device messages',
        icon: Cpu,
      },
      {
        id: 'rtc',
        to: ROUTE_PATHS.RTC,
        label: 'RTC',
        description: 'Channel credentials, provider health and stats',
        icon: RadioTower,
      },
      {
        id: 'im-server',
        to: ROUTE_PATHS.IM_SERVER,
        label: 'IM Server',
        description: 'WuKongIM channels, subscribers and control plane',
        icon: ServerCog,
      },
    ],
  },
  {
    section: 'Platform',
    items: [
      {
        id: 'system',
        to: ROUTE_PATHS.SYSTEM,
        label: 'System',
        description: 'Config center, audit ledger and cloud posture',
        icon: Settings2,
      },
    ],
  },
];

export function resolveRouteMeta(pathname: string) {
  const allItems = navigationGroups.flatMap((group) => group.items);
  return allItems.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}
