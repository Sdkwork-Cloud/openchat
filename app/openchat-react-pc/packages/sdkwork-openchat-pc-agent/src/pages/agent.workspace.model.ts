import { AgentCategory, AgentStatus, type Agent } from "../entities/agent.entity";

export type AgentWorkbenchRail = "all" | "featured" | "mine" | "recent" | "active";

interface AgentFilterInput {
  agents: Agent[];
  rail: AgentWorkbenchRail;
  category?: AgentCategory;
  keyword?: string;
}

interface AgentPreviewInput extends AgentFilterInput {
  preferredId?: string | null;
}

export interface AgentWorkbenchSummary {
  total: number;
  mine: number;
  active: number;
  featured: Agent[];
  recent: Agent[];
}

export interface AgentWorkbenchLibrary {
  favorites: Agent[];
  recentOpened: Agent[];
}

interface BuildAgentWorkbenchLibraryInput {
  favoriteAgentIds: string[];
  recentOpenedAgentIds: string[];
}

const ACTIVE_STATUSES = new Set<AgentStatus>([AgentStatus.CHATTING, AgentStatus.EXECUTING]);

function scoreAgent(agent: Agent): number {
  const rating = Number(agent.config.rating ?? 0);
  const usage = Number(agent.config.usageCount ?? 0);
  return rating * 10_000 + usage;
}

function byFeatured(left: Agent, right: Agent): number {
  return scoreAgent(right) - scoreAgent(left);
}

function byRecent(left: Agent, right: Agent): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function isMine(agent: Agent): boolean {
  return agent.ownerId === "current-user" || agent.config.creator === "You";
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    result.push(id);
  });

  return result;
}

function byRail(agents: Agent[], rail: AgentWorkbenchRail): Agent[] {
  if (rail === "mine") {
    return agents.filter(isMine).sort(byFeatured);
  }
  if (rail === "recent") {
    return [...agents].sort(byRecent);
  }
  if (rail === "active") {
    return agents.filter((agent) => ACTIVE_STATUSES.has(agent.status)).sort(byFeatured);
  }
  if (rail === "featured") {
    return [...agents].sort(byFeatured);
  }
  return [...agents].sort(byFeatured);
}

function byCategory(agents: Agent[], category: AgentCategory): Agent[] {
  if (!category || category === AgentCategory.ALL) {
    return agents;
  }
  return agents.filter((agent) => agent.config.category === category);
}

function byKeyword(agents: Agent[], keyword?: string): Agent[] {
  const normalized = keyword?.trim().toLowerCase();
  if (!normalized) {
    return agents;
  }

  return agents.filter((agent) => {
    const searchIndex = `${agent.name} ${agent.description || ""} ${(agent.config.tags || []).join(" ")}`.toLowerCase();
    return searchIndex.includes(normalized);
  });
}

export function buildAgentWorkbenchSummary(agents: Agent[]): AgentWorkbenchSummary {
  const featured = [...agents].sort(byFeatured).slice(0, 6);
  const recent = [...agents].sort(byRecent).slice(0, 6);

  return {
    total: agents.length,
    mine: agents.filter(isMine).length,
    active: agents.filter((agent) => ACTIVE_STATUSES.has(agent.status)).length,
    featured,
    recent,
  };
}

export function applyAgentWorkbenchFilter(input: AgentFilterInput): Agent[] {
  const category = input.category || AgentCategory.ALL;
  const withRail = byRail(input.agents, input.rail);
  const withCategory = byCategory(withRail, category);
  return byKeyword(withCategory, input.keyword);
}

export function buildAgentWorkbenchLibrary(
  agents: Agent[],
  input: BuildAgentWorkbenchLibraryInput,
): AgentWorkbenchLibrary {
  const agentById = new Map(agents.map((item) => [item.id, item]));

  const favorites = uniqueIds(input.favoriteAgentIds)
    .map((agentId) => agentById.get(agentId))
    .filter((item): item is Agent => Boolean(item));

  const recentOpened = uniqueIds(input.recentOpenedAgentIds)
    .map((agentId) => agentById.get(agentId))
    .filter((item): item is Agent => Boolean(item));

  return {
    favorites,
    recentOpened,
  };
}

export function pickAgentPreviewTarget(input: AgentPreviewInput): string | null {
  const scoped = applyAgentWorkbenchFilter(input);
  if (scoped.length === 0) {
    return null;
  }

  if (input.preferredId && scoped.some((item) => item.id === input.preferredId)) {
    return input.preferredId;
  }

  return scoped[0]?.id || null;
}
