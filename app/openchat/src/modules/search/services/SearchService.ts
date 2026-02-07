
import { Agent } from '../../../types/core';
import { calculateSimilarity } from '../../../utils/algorithms';
import { getAgent } from '../../../services/agentRegistry';
import { AgentService } from '../../agents/services/AgentService';
import { ChatService, ChatSession, Message } from '../../chat/services/ChatService';

export interface SearchResult {
    agents: (Agent & { score: number })[];
    chats: any[];
}

class SearchServiceImpl {
    
    /**
     * Smart Scoring Algorithm
     */
    private getScore(text: string, query: string, weight: number): number {
        if (!text || !query) return 0;
        const t = text.toLowerCase();
        const q = query.toLowerCase();

        let baseScore = 0;
        if (t === q) baseScore = 100;
        else if (t.startsWith(q)) baseScore = 90;
        else if (t.includes(q)) baseScore = 80;
        else baseScore = calculateSimilarity(t, q);

        return baseScore * weight;
    }

    /**
     * Autonomous Search: Fetches data internally
     */
    async search(query: string): Promise<SearchResult> {
        if (!query.trim()) return { agents: [], chats: [] };

        // 1. Search Agents (Unified Source)
        const { data: allAgents } = await AgentService.getAgentsByCategory('all');
        
        const matchedAgents = (allAgents || [])
            .map(agent => {
                const nameScore = this.getScore(agent.name, query, 1.5);
                const descScore = this.getScore(agent.description, query, 1.0);
                const tagScore = (agent.tags?.some(tag => tag.includes(query)) ? 85 : 0) * 0.8;
                
                return { ...agent, score: Math.max(nameScore, descScore, tagScore) };
            })
            .filter(agent => agent.score > 50)
            .sort((a, b) => b.score - a.score);

        // 2. Search Chats (Fetch from ChatService directly)
        const { data: sessions } = await ChatService.getSessionList();
        
        const matchedChats = (sessions || [])
            .map(session => {
                const agent = getAgent(session.agentId);
                const nameScore = this.getScore(agent.name, query, 1.2);
                
                let maxMsgScore = 0;
                let bestMsg: Message | null = null;

                // Scan recent messages
                const recentMessages = session.messages.slice(-100);
                
                for (let i = recentMessages.length - 1; i >= 0; i--) {
                    const msg = recentMessages[i];
                    const contentScore = this.getScore(msg.content, query, 1.0);
                    
                    const recencyBoost = (i / recentMessages.length) * 10;
                    const finalMsgScore = contentScore + recencyBoost;
                    
                    if (finalMsgScore > maxMsgScore) {
                        maxMsgScore = finalMsgScore;
                        bestMsg = msg;
                    }
                }

                const finalScore = Math.max(nameScore, maxMsgScore);
                return { session, score: finalScore, matchMsg: bestMsg };
            })
            .filter(item => item.score > 50)
            .sort((a, b) => b.score - a.score);

        return { agents: matchedAgents, chats: matchedChats };
    }
}

export const SearchService = new SearchServiceImpl();
