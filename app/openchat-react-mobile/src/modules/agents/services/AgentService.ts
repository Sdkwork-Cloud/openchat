
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { Agent } from '../../../types/core';
import { AGENT_REGISTRY, DEFAULT_AGENT_ID } from '../../../services/agentRegistry';

// We extend Agent to include BaseEntity fields for the custom ones
export interface CustomAgent extends Agent, BaseEntity {
    isSystem: boolean;
}

class AgentServiceImpl extends AbstractStorageService<CustomAgent> {
  protected STORAGE_KEY = 'sys_custom_agents_v1';

  constructor() {
      super();
      // No seed data needed, we pull from REGISTRY for defaults
  }

  /**
   * Hybrid Query: Merges System Registry + User Created Agents
   */
  async getAgentsByCategory(category: string): Promise<Result<Agent[]>> {
    // 1. Get System Agents
    const systemAgents = Object.values(AGENT_REGISTRY).filter(agent => {
        const tags = agent.tags || ['all'];
        if (category === 'all') return true;
        return tags.includes(category);
    });

    // 2. Get Custom Agents from Storage
    const customAgents = await this.loadData();
    const filteredCustom = customAgents.filter(agent => {
        if (category === 'all' || category === 'mine') return true;
        return false; // Custom agents usually go to 'all' or 'mine'
    });

    // 3. Merge
    // If category is specific (e.g. 'prod'), mostly system agents.
    // If category is 'mine', ONLY custom agents (plus maybe pinned ones).
    
    let result: Agent[] = [];
    
    if (category === 'mine') {
        result = [...filteredCustom];
    } else {
        result = [...systemAgents, ...filteredCustom];
    }

    return { success: true, data: result };
  }

  /**
   * Unified Find by ID
   */
  async getAgentById(id: string): Promise<Result<Agent>> {
      // Check Registry first
      if (AGENT_REGISTRY[id]) {
          return { success: true, data: AGENT_REGISTRY[id] };
      }
      
      // Check Storage
      const result = await this.findById(id);
      if (result.success && result.data) {
          return { success: true, data: result.data };
      }

      return { success: false, message: 'Agent not found' };
  }

  /**
   * Create a new Custom Agent
   */
  async createCustomAgent(data: Partial<Agent>): Promise<Result<CustomAgent>> {
      const now = Date.now();
      const newAgent: Partial<CustomAgent> = {
          ...data,
          id: data.id || `custom_${Date.now()}`, // Ensure unique ID
          isSystem: false,
          tags: ['mine'], // Auto-tag as mine
          createTime: now,
          updateTime: now
      };
      
      return await this.save(newAgent);
  }
}

export const AgentService = new AgentServiceImpl();
