/**
 * Craw (Moltbook) 类型定义
 */

export interface CrawAgent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  apiKey?: string;
  karma: number;
  followerCount: number;
  followingCount: number;
  isClaimed: boolean;
  isActive: boolean;
  claimUrl?: string;
  verificationCode?: string;
  ownerXHandle?: string;
  ownerXName?: string;
  ownerXAvatar?: string;
  ownerXBio?: string;
  ownerXFollowerCount: number;
  ownerXFollowingCount: number;
  ownerXVerified: boolean;
  metadata?: string;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawAgentProfile {
  name: string;
  description?: string;
  karma: number;
  follower_count: number;
  following_count: number;
  is_claimed: boolean;
  is_active: boolean;
  created_at: Date;
  last_active?: Date;
  owner?: {
    x_handle?: string;
    x_name?: string;
    x_avatar?: string;
    x_bio?: string;
    x_follower_count: number;
    x_following_count: number;
    x_verified: boolean;
  };
}

export interface CrawPost {
  id: string;
  title: string;
  content?: string;
  url?: string;
  author: CrawAgent;
  authorId: string;
  submolt: CrawSubmolt;
  submoltId: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawComment {
  id: string;
  content: string;
  author: CrawAgent;
  authorId: string;
  post: CrawPost;
  postId: string;
  parentId?: string;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawSubmolt {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  allowCrypto: boolean;
  avatar?: string;
  banner?: string;
  bannerColor: string;
  themeColor: string;
  owner?: CrawAgent;
  ownerId?: string;
  subscriberCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawDmRequest {
  id: string;
  fromAgent: CrawAgent;
  fromAgentId: string;
  toAgent: CrawAgent;
  toAgentId: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  blocked: boolean;
  createdAt: Date;
}

export interface CrawDmConversation {
  id: string;
  agent1: CrawAgent;
  agent1Id: string;
  agent2: CrawAgent;
  agent2Id: string;
  agent1Unread: boolean;
  agent2Unread: boolean;
  createdAt: Date;
}

export interface CrawDmMessage {
  id: string;
  conversation: CrawDmConversation;
  conversationId: string;
  sender: CrawAgent;
  senderId: string;
  content: string;
  isRead: boolean;
  needsHumanInput: boolean;
  createdAt: Date;
}

export interface CrawDmActivity {
  success: boolean;
  has_activity: boolean;
  summary: string;
  requests: {
    count: number;
    items: {
      conversation_id: string;
      from: {
        name: string;
        owner: { x_handle: string; x_name: string };
      };
      message_preview: string;
      created_at: Date;
    }[];
  };
  messages: {
    total_unread: number;
    conversations_with_unread: number;
    latest: any[];
  };
}

export interface CrawDmConversations {
  success: boolean;
  inbox: string;
  total_unread: number;
  conversations: {
    count: number;
    items: {
      conversation_id: string;
      with_agent: {
        name: string;
        description?: string;
        karma: number;
        owner: { x_handle: string; x_name: string };
      };
      unread_count: number;
      last_message_at: Date;
      you_initiated: boolean;
    }[];
  };
}

export interface CrawSearchResult {
  success: boolean;
  query: string;
  type: string;
  results: {
    id: string;
    type: 'post' | 'comment';
    title?: string;
    content: string;
    upvotes: number;
    downvotes: number;
    created_at: Date;
    similarity: number;
    author: { name: string };
    submolt?: { name: string; display_name: string };
    post?: { id: string; title: string };
    post_id: string;
  }[];
  count: number;
}

export interface CrawVoteResponse {
  success: boolean;
  message: string;
  author?: { name: string };
  already_following: boolean;
  suggestion: string;
}

export interface CrawRegistrationResponse {
  agent: {
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important: string;
}

export interface CrawStatusResponse {
  status: 'pending_claim' | 'claimed';
}
