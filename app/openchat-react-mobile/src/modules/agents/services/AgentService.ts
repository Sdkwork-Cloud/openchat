
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { Agent } from '../../../types/core';
import { AGENT_REGISTRY, DEFAULT_AGENT_ID } from '../../../services/agentRegistry';

/**
 * CustomAgent 扩展了 Agent 基础属性，并符合存储层的 BaseEntity 规范
 */
export interface CustomAgent extends Agent, BaseEntity {
    isSystem: boolean;
    popularity: number; // 用于智能排序的权重
}

class AgentServiceImpl extends AbstractStorageService<CustomAgent> {
  protected STORAGE_KEY = 'sys_custom_agents_v1';

  /**
   * 核心初始化逻辑：确保系统内置智能体在存储层可见
   */
  protected async onInitialize() {
      const list = await this.loadData();
      
      // 如果存储层是空的，或者我们需要强制同步系统 Agent
      // 这里我们检查 Registry 中的 key 是否都在 list 中
      const registryValues = Object.values(AGENT_REGISTRY);
      let hasChanges = false;

      for (const registryAgent of registryValues) {
          const exists = list.some(a => a.id === registryAgent.id);
          if (!exists) {
              const now = Date.now();
              const newAgent: CustomAgent = {
                  ...registryAgent,
                  isSystem: true,
                  popularity: registryAgent.id === DEFAULT_AGENT_ID ? 1000 : 100,
                  createTime: now,
                  updateTime: now
              };
              list.push(newAgent);
              hasChanges = true;
          }
      }

      if (hasChanges) {
          this.cache = list;
          await this.commit();
      }
  }

  /**
   * 增强型分类检索：支持智能权重排序
   */
  async getAgentsByCategory(category: string): Promise<Result<CustomAgent[]>> {
    // 触发确保初始化已完成
    await this.loadData(); 
    
    const { data: page } = await this.findAll({
        // 默认按创建时间倒序，但我们在下面会进行权重二次排序
        sort: { field: 'createTime', order: 'desc' }
    });

    let list = page?.content || [];

    // 1. 分类过滤
    if (category !== 'all') {
        list = list.filter(agent => {
            const tags = agent.tags || [];
            if (category === 'mine') return !agent.isSystem;
            return tags.includes(category);
        });
    }

    // 2. 权重排序 (官方优先 > 活跃度排序)
    list.sort((a, b) => {
        // DEFAULT_AGENT_ID 永远第一
        if (a.id === DEFAULT_AGENT_ID) return -1;
        if (b.id === DEFAULT_AGENT_ID) return 1;
        
        // 系统 Agent 优先
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        
        // 权重排序
        return (b.popularity || 0) - (a.popularity || 0);
    });

    return { success: true, data: list };
  }

  async getAgentById(id: string): Promise<Result<CustomAgent>> {
      return await this.findById(id);
  }

  async createCustomAgent(data: Partial<Agent>): Promise<Result<CustomAgent>> {
      const now = Date.now();
      const newAgent: Partial<CustomAgent> = {
          ...data,
          id: data.id || `custom_${Date.now()}`,
          isSystem: false,
          popularity: 0,
          tags: ['mine', 'all'],
          createTime: now,
          updateTime: now
      };
      
      return await this.save(newAgent);
  }
}

export const AgentService = new AgentServiceImpl();
