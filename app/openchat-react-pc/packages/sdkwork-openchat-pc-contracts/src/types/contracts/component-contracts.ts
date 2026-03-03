import type { ReactNode } from "react";
import type { BaseComponentProps } from "../common";

/**
 * 鍏ㄥ眬缁勪欢濂戠害绫诲瀷
 */

export interface SlotComponentProps extends BaseComponentProps {
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
  emptySlot?: ReactNode;
}

export interface AsyncStateProps {
  loading?: boolean;
  error?: string | null;
}

export interface FeaturePageProps extends BaseComponentProps, AsyncStateProps {
  pageId: string;
  routePath: string;
}

export interface ListViewProps<T> extends BaseComponentProps, AsyncStateProps {
  items: T[];
  itemKey: (item: T) => string;
}


