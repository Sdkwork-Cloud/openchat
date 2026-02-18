/**
 * Craw (Moltbook) API Service
 */

import { EventEmitter } from 'eventemitter3';
import {
  CrawAgent,
  CrawAgentProfile,
  CrawPost,
  CrawComment,
  CrawSubmolt,
  CrawDmActivity,
  CrawDmConversations,
  CrawSearchResult,
  CrawVoteResponse,
  CrawRegistrationResponse,
  CrawStatusResponse,
} from '../types/craw';

export interface CrawServiceOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class CrawService extends EventEmitter {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: CrawServiceOptions = {}) {
    super();
    this.baseUrl = options.baseUrl || 'https://www.moltbook.com/api/v1';
    this.apiKey = options.apiKey || '';
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ==================== Agent APIs ====================

  async register(name: string, description?: string): Promise<CrawRegistrationResponse> {
    return this.request<CrawRegistrationResponse>({
      method: 'POST',
      url: `${this.baseUrl}/agents/register`,
      data: { name, description },
    });
  }

  async getStatus(): Promise<CrawStatusResponse> {
    return this.request<CrawStatusResponse>({
      method: 'GET',
      url: `${this.baseUrl}/agents/status`,
      headers: this.getHeaders(),
    });
  }

  async getMe(): Promise<{ success: boolean; agent: CrawAgentProfile }> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/agents/me`,
      headers: this.getHeaders(),
    });
  }

  async getProfile(name: string): Promise<{ success: boolean; agent: CrawAgentProfile }> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/agents/profile`,
      params: { name },
      headers: this.getHeaders(),
    });
  }

  async updateProfile(data: { description?: string; metadata?: string }): Promise<any> {
    return this.request({
      method: 'PATCH',
      url: `${this.baseUrl}/agents/me`,
      data,
      headers: this.getHeaders(),
    });
  }

  async uploadAvatar(file: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/me/avatar`,
      data: { file },
      headers: this.getHeaders(),
    });
  }

  async deleteAvatar(): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/agents/me/avatar`,
      headers: this.getHeaders(),
    });
  }

  async setupOwnerEmail(email: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/me/setup-owner-email`,
      data: { email },
      headers: this.getHeaders(),
    });
  }

  // ==================== Post APIs ====================

  async createPost(data: { submolt: string; title: string; content?: string; url?: string }): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/posts`,
      data,
      headers: this.getHeaders(),
    });
  }

  async getPosts(options: { sort?: string; limit?: number; submolt?: string } = {}): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/posts`,
      params: options,
      headers: this.getHeaders(),
    });
  }

  async getPost(postId: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/posts/${postId}`,
      headers: this.getHeaders(),
    });
  }

  async deletePost(postId: string): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/posts/${postId}`,
      headers: this.getHeaders(),
    });
  }

  async createComment(postId: string, data: { content: string; parentId?: string }): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/posts/${postId}/comments`,
      data,
      headers: this.getHeaders(),
    });
  }

  async getComments(postId: string, sort: string = 'top'): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/posts/${postId}/comments`,
      params: { sort },
      headers: this.getHeaders(),
    });
  }

  async upvotePost(postId: string): Promise<CrawVoteResponse> {
    return this.request<CrawVoteResponse>({
      method: 'POST',
      url: `${this.baseUrl}/posts/${postId}/upvote`,
      headers: this.getHeaders(),
    });
  }

  async downvotePost(postId: string): Promise<CrawVoteResponse> {
    return this.request<CrawVoteResponse>({
      method: 'POST',
      url: `${this.baseUrl}/posts/${postId}/downvote`,
      headers: this.getHeaders(),
    });
  }

  async upvoteComment(commentId: string): Promise<CrawVoteResponse> {
    return this.request<CrawVoteResponse>({
      method: 'POST',
      url: `${this.baseUrl}/comments/${commentId}/upvote`,
      headers: this.getHeaders(),
    });
  }

  async pinPost(postId: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/posts/${postId}/pin`,
      headers: this.getHeaders(),
    });
  }

  async unpinPost(postId: string): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/posts/${postId}/pin`,
      headers: this.getHeaders(),
    });
  }

  // ==================== Submolt APIs ====================

  async createSubmolt(data: { name: string; displayName: string; description?: string; allowCrypto?: boolean }): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/submolts`,
      data,
      headers: this.getHeaders(),
    });
  }

  async getSubmolts(): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/submolts`,
      headers: this.getHeaders(),
    });
  }

  async getSubmolt(name: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/submolts/${name}`,
      headers: this.getHeaders(),
    });
  }

  async getSubmoltFeed(name: string, sort: string = 'new', limit: number = 25): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/submolts/${name}/feed`,
      params: { sort, limit },
      headers: this.getHeaders(),
    });
  }

  async subscribe(name: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/submolts/${name}/subscribe`,
      headers: this.getHeaders(),
    });
  }

  async unsubscribe(name: string): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/submolts/${name}/subscribe`,
      headers: this.getHeaders(),
    });
  }

  async updateSubmoltSettings(name: string, data: { description?: string; bannerColor?: string; themeColor?: string }): Promise<any> {
    return this.request({
      method: 'PATCH',
      url: `${this.baseUrl}/submolts/${name}/settings`,
      data,
      headers: this.getHeaders(),
    });
  }

  async uploadSubmoltMedia(name: string, file: string, type: 'avatar' | 'banner'): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/submolts/${name}/settings`,
      data: { file, type },
      headers: this.getHeaders(),
    });
  }

  async addModerator(name: string, agentName: string, role: string = 'moderator'): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/submolts/${name}/moderators`,
      data: { agent_name: agentName, role },
      headers: this.getHeaders(),
    });
  }

  async removeModerator(name: string, agentName: string): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/submolts/${name}/moderators`,
      data: { agent_name: agentName },
      headers: this.getHeaders(),
    });
  }

  async getModerators(name: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/submolts/${name}/moderators`,
      headers: this.getHeaders(),
    });
  }

  // ==================== Follow APIs ====================

  async follow(agentName: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/${agentName}/follow`,
      headers: this.getHeaders(),
    });
  }

  async unfollow(agentName: string): Promise<any> {
    return this.request({
      method: 'DELETE',
      url: `${this.baseUrl}/agents/${agentName}/follow`,
      headers: this.getHeaders(),
    });
  }

  // ==================== Feed API ====================

  async getFeed(sort: string = 'hot', limit: number = 25): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/feed`,
      params: { sort, limit },
      headers: this.getHeaders(),
    });
  }

  // ==================== Search API ====================

  async search(query: string, type: string = 'all', limit: number = 20): Promise<CrawSearchResult> {
    return this.request<CrawSearchResult>({
      method: 'GET',
      url: `${this.baseUrl}/search`,
      params: { q: query, type, limit },
      headers: this.getHeaders(),
    });
  }

  // ==================== DM APIs ====================

  async checkDm(): Promise<CrawDmActivity> {
    return this.request<CrawDmActivity>({
      method: 'GET',
      url: `${this.baseUrl}/agents/dm/check`,
      headers: this.getHeaders(),
    });
  }

  async sendDmRequest(data: { to?: string; to_owner?: string; message: string }): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/dm/request`,
      data,
      headers: this.getHeaders(),
    });
  }

  async getDmRequests(): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/agents/dm/requests`,
      headers: this.getHeaders(),
    });
  }

  async approveDmRequest(requestId: string): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/dm/requests/${requestId}/approve`,
      headers: this.getHeaders(),
    });
  }

  async rejectDmRequest(requestId: string, block: boolean = false): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/dm/requests/${requestId}/reject`,
      data: { block },
      headers: this.getHeaders(),
    });
  }

  async getDmConversations(): Promise<CrawDmConversations> {
    return this.request<CrawDmConversations>({
      method: 'GET',
      url: `${this.baseUrl}/agents/dm/conversations`,
      headers: this.getHeaders(),
    });
  }

  async getDmConversation(conversationId: string): Promise<any> {
    return this.request({
      method: 'GET',
      url: `${this.baseUrl}/agents/dm/conversations/${conversationId}`,
      headers: this.getHeaders(),
    });
  }

  async sendDmMessage(conversationId: string, data: { message: string; needs_human_input?: boolean }): Promise<any> {
    return this.request({
      method: 'POST',
      url: `${this.baseUrl}/agents/dm/conversations/${conversationId}/send`,
      data,
      headers: this.getHeaders(),
    });
  }

  private async request<T = any>(options: {
    method?: string;
    url: string;
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<T> {
    const response = await fetch(options.url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.data ? JSON.stringify(options.data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export function createCrawService(options?: CrawServiceOptions): CrawService {
  return new CrawService(options);
}
