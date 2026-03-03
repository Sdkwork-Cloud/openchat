/**
 * App Store 瀹炰綋
 *
 * 瀹氫箟搴旂敤鍟嗗簵涓殑搴旂敤銆佹妧鑳姐€佸伐鍏风瓑瀹炰綋
 */

export interface AppCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  appCount: number;
}

export interface AppRating {
  average: number;
  count: number;
  distribution: number[];
}

export interface AppDeveloper {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
  appCount: number;
  rating: number;
}

export interface AppScreenshot {
  id: string;
  url: string;
  thumbnail?: string;
  type: "phone" | "tablet" | "desktop";
}

export interface AppFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface AppUpdate {
  version: string;
  date: string;
  content: string;
}

export interface App {
  id: string;
  name: string;
  nameEn: string;
  shortDescription: string;
  description: string;
  icon: string;
  coverImage?: string;
  screenshots: AppScreenshot[];
  developer: AppDeveloper;
  category: AppCategory;
  tags: string[];
  features: AppFeature[];
  version: string;
  size: string;
  downloads: number;
  rating: AppRating;
  price: number;
  currency: string;
  inAppPurchases: boolean;
  ageRating: string;
  languages: string[];
  released: string;
  updated: string;
  website?: string;
  privacyPolicy?: string;
  supportEmail?: string;
  type: "skill" | "tool" | "agent" | "plugin" | "theme";
  status: "active" | "inactive" | "pending" | "rejected";
  featured: boolean;
  editorChoice: boolean;
  trending: boolean;
}

export interface AppReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  helpful: number;
  version: string;
  device?: string;
  images?: string[];
  developerReply?: {
    content: string;
    date: string;
  };
}

export interface SearchResult {
  apps: App[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FeaturedApp {
  app: App;
  position: "hero" | "banner" | "card" | "small";
  priority: number;
}

export interface AppCollection {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type:
    | "featured"
    | "editor"
    | "trending"
    | "new"
    | "top"
    | "category"
    | "custom";
  apps: App[];
  displayType: "hero" | "grid" | "list" | "carousel";
  backgroundColor?: string;
  gradient?: string;
}




