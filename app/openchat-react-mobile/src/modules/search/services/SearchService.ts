
import React from 'react';
import { Agent } from '../../../types/core';
import { GlobalSearchEngine } from '../../../utils/searchEngine';
import { AgentService } from '../../agents/services/AgentService';
import { ChatService } from '../../chat/services/ChatService';
import { FileService } from '../../drive/services/FileService';
import { ArticleService } from '../../content/services/ArticleService';
import { CreationService } from '../../creation/services/CreationService';
import { Platform } from '../../../platform';
import { AppEvents, EVENTS } from '../../../core/events';

export interface SearchResultItem {
    id: string; 
    title: string;
    subTitle: string;
    avatar: string | React.ReactNode;
    type: 'agent' | 'chat' | 'file' | 'article' | 'creation';
    sessionId: string;
    messageId?: string;
    score: number;
    timestamp: number;
}

export interface SearchResult {
    agents: SearchResultItem[];
    chats: SearchResultItem[];
    others: SearchResultItem[]; // Unified list for files, articles, creations
}

class SearchServiceImpl {
    private HISTORY_KEY = 'sys_search_history_v1';
    private isIndexDirty = true;
    private buildPromise: Promise<void> | null = null;

    constructor() {
        // Subscribe to global data changes to mark index as dirty
        AppEvents.on(EVENTS.DATA_CHANGE, () => {
            this.isIndexDirty = true;
        });
    }
    
    /**
     * Build the Inverted Index from all data sources.
     * Guarded by a promise to prevent concurrent builds.
     */
    private async ensureIndexBuilt() {
        if (!this.isIndexDirty) return;
        
        if (this.buildPromise) return this.buildPromise;

        this.buildPromise = this.buildIndex();
        await this.buildPromise;
        
        this.buildPromise = null;
        this.isIndexDirty = false;
    }

    /**
     * Helper: Yield to main thread to prevent blocking UI
     */
    private async yieldToMain() {
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    private async buildIndex() {
        console.log('[SearchService] Rebuilding Index (Non-blocking)...');
        const CHUNK_SIZE = 50; // Process 50 items per tick

        // 1. Fetch Data (Parallel Fetch for Speed)
        const [agentsRes, sessionsRes, filesRes, articlesRes, creationsRes] = await Promise.all([
            AgentService.getAgentsByCategory('all'),
            ChatService.getSessionList(),
            FileService.findAll({ pageRequest: { page: 1, size: 500 } }),
            ArticleService.findAll({ pageRequest: { page: 1, size: 100 } }),
            CreationService.findAll({ pageRequest: { page: 1, size: 100 } })
        ]);

        const agents = agentsRes.data || [];
        const sessions = sessionsRes.data || [];
        const filesList = filesRes.data?.content || [];
        const articlesList = articlesRes.data?.content || [];
        const creationsList = creationsRes.data?.content || [];

        // GlobalSearchEngine is additive. For a real app, clear it first.
        // GlobalSearchEngine.clear(); 

        let processedCount = 0;

        // 2. Feed Agents
        for (const agent of agents) {
            GlobalSearchEngine.add(agent.id, `${agent.name} ${agent.description}`, {
                type: 'agent',
                entity: agent
            });
            processedCount++;
            if (processedCount % CHUNK_SIZE === 0) await this.yieldToMain();
        }

        // 3. Feed Chat Messages (Most CPU Intensive)
        for (const session of sessions) {
            // Process messages in chunks
            for (const msg of session.messages) {
                if (msg.role === 'system' || !msg.content) continue;
                GlobalSearchEngine.add(msg.id, msg.content, {
                    type: 'chat',
                    sessionId: session.id,
                    entity: msg,
                    sessionTitle: session.groupName || 'Chat'
                });
                processedCount++;
                if (processedCount % CHUNK_SIZE === 0) await this.yieldToMain();
            }
        }

        // 4. Feed Files
        for (const file of filesList) {
            GlobalSearchEngine.add(file.id, file.name, {
                type: 'file',
                entity: file
            });
            processedCount++;
            if (processedCount % CHUNK_SIZE === 0) await this.yieldToMain();
        }

        // 5. Feed Articles
        for (const art of articlesList) {
            GlobalSearchEngine.add(art.id, `${art.title} ${art.summary}`, {
                type: 'article',
                entity: art
            });
            processedCount++;
            if (processedCount % CHUNK_SIZE === 0) await this.yieldToMain();
        }

        // 6. Feed Creations
        for (const cr of creationsList) {
            GlobalSearchEngine.add(cr.id, `${cr.title} ${cr.prompt}`, {
                type: 'creation',
                entity: cr
            });
            processedCount++;
            if (processedCount % CHUNK_SIZE === 0) await this.yieldToMain();
        }
        
        console.log(`[SearchService] Index built. ${processedCount} items indexed.`);
    }

    private generateSnippet(content: string, keyword: string): string {
        const lower = content.toLowerCase();
        const k = keyword.toLowerCase();
        const idx = lower.indexOf(k);
        if (idx === -1) return content.slice(0, 30);
        
        const start = Math.max(0, idx - 10);
        const end = Math.min(content.length, idx + k.length + 20);
        return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
    }

    /**
     * Top-Tier Search Implementation
     */
    async search(query: string, contextSessionId?: string): Promise<SearchResult> {
        if (!query.trim()) return { agents: [], chats: [], others: [] };

        // Ensure index is fresh
        await this.ensureIndexBuilt();

        const rawResults = GlobalSearchEngine.search<any>(query);
        const results: SearchResult = { agents: [], chats: [], others: [] };

        for (const doc of rawResults) {
            // Context Filtering for Chat
            if (contextSessionId && doc.type === 'chat' && doc.sessionId !== contextSessionId) {
                continue;
            }

            if (doc.type === 'agent') {
                const agent = doc.entity as Agent;
                results.agents.push({
                    id: agent.id,
                    title: agent.name,
                    subTitle: agent.description,
                    avatar: agent.avatar,
                    type: 'agent',
                    sessionId: '',
                    score: 100,
                    timestamp: Date.now()
                });
            } else if (doc.type === 'chat') {
                const msg = doc.entity;
                results.chats.push({
                    id: msg.id,
                    title: doc.sessionTitle || 'Chat',
                    subTitle: this.generateSnippet(msg.content, query),
                    avatar: '💬',
                    type: 'chat',
                    sessionId: doc.sessionId,
                    messageId: msg.id,
                    score: 80,
                    timestamp: msg.createTime
                });
            } else if (doc.type === 'file') {
                const f = doc.entity;
                results.others.push({
                    id: f.id,
                    title: f.name,
                    subTitle: '文件',
                    avatar: '📂',
                    type: 'file',
                    sessionId: '',
                    score: 70,
                    timestamp: f.updateTime
                });
            } else if (doc.type === 'article') {
                const a = doc.entity;
                results.others.push({
                    id: a.id,
                    title: a.title,
                    subTitle: '文章',
                    avatar: '📰',
                    type: 'article',
                    sessionId: '',
                    score: 60,
                    timestamp: a.createTime
                });
            } else if (doc.type === 'creation') {
                const c = doc.entity;
                results.others.push({
                    id: c.id,
                    title: c.title,
                    subTitle: '作品',
                    avatar: '🎨',
                    type: 'creation',
                    sessionId: '',
                    score: 60,
                    timestamp: c.createTime
                });
            }
        }

        // Limit results for UI performance
        results.agents = results.agents.slice(0, 5);
        results.chats = results.chats.slice(0, 20);
        results.others = results.others.slice(0, 20);

        return results;
    }

    // --- History Management ---

    async getHistory(): Promise<string[]> {
        const raw = await Platform.storage.get(this.HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    async addHistory(text: string): Promise<void> {
        if (!text.trim()) return;
        let list = await this.getHistory();
        list = list.filter(item => item !== text);
        list.unshift(text);
        if (list.length > 10) list.pop();
        await Platform.storage.set(this.HISTORY_KEY, JSON.stringify(list));
    }

    async clearHistory(): Promise<void> {
        await Platform.storage.remove(this.HISTORY_KEY);
    }
}

export const SearchService = new SearchServiceImpl();
