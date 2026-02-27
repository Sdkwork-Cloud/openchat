import {
  Tool,
  ToolCategory,
  UserTool,
  ToolMarketItem,
  ToolCategoryInfo,
  ToolTestResult,
  AuthConfig,
} from "../entities/tool.entity";

const MOCK_TOOLS: ToolMarketItem[] = [
  {
    id: "tool-1",
    name: "天气查询",
    description: "查询全球城市天气信息，支持实时天气和预报",
    icon: "🌤️",
    category: ToolCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.weather.example.com/v1",
    method: "GET",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 15000,
    successRate: 0.98,
    avgResponseTime: 200,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "tool-2",
    name: "邮件发送",
    description: "发送电子邮件，支持 SMTP 协议",
    icon: "📧",
    category: ToolCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.email.example.com/send",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 8900,
    successRate: 0.95,
    avgResponseTime: 500,
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-03-05T00:00:00Z",
  },
  {
    id: "tool-3",
    name: "数据库查询",
    description: "执行 SQL 查询，返回查询结果",
    icon: "🗄️",
    category: ToolCategory.DEVELOPER,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.db.example.com/query",
    method: "POST",
    auth: { type: "bearer", token: "" },
    usageCount: 5600,
    successRate: 0.99,
    avgResponseTime: 150,
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "tool-4",
    name: "PDF 生成",
    description: "将 HTML 或数据转换为 PDF 文档",
    icon: "📄",
    category: ToolCategory.DATA,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.pdf.example.com/generate",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 4500,
    successRate: 0.97,
    avgResponseTime: 800,
    createdAt: "2024-02-10T00:00:00Z",
    updatedAt: "2024-03-12T00:00:00Z",
  },
  {
    id: "tool-5",
    name: "OCR 文字识别",
    description: "从图片中提取文字，支持多种语言",
    icon: "🔤",
    category: ToolCategory.AI,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.ocr.example.com/recognize",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 7800,
    successRate: 0.96,
    avgResponseTime: 600,
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "tool-6",
    name: "短信发送",
    description: "发送短信验证码和通知",
    icon: "💬",
    category: ToolCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.sms.example.com/send",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 6200,
    successRate: 0.99,
    avgResponseTime: 300,
    createdAt: "2024-02-20T00:00:00Z",
    updatedAt: "2024-03-18T00:00:00Z",
  },
  {
    id: "tool-7",
    name: "Slack 通知",
    description: "向 Slack 频道发送消息",
    icon: "💼",
    category: ToolCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://slack.com/api/chat.postMessage",
    method: "POST",
    auth: { type: "bearer", token: "" },
    usageCount: 4100,
    successRate: 0.98,
    avgResponseTime: 250,
    createdAt: "2024-02-25T00:00:00Z",
    updatedAt: "2024-03-20T00:00:00Z",
  },
  {
    id: "tool-8",
    name: "GitHub 操作",
    description: "执行 GitHub Actions，创建 issue，提交 PR",
    icon: "🐙",
    category: ToolCategory.DEVELOPER,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.github.com",
    method: "POST",
    auth: { type: "bearer", token: "" },
    usageCount: 5500,
    successRate: 0.97,
    avgResponseTime: 400,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-22T00:00:00Z",
  },
];

const TOOL_CATEGORIES: ToolCategoryInfo[] = [
  { id: "all", name: "全部", icon: "📦" },
  { id: "utility", name: "工具", icon: "🔧" },
  { id: "developer", name: "开发", icon: "💻" },
  { id: "data", name: "数据", icon: "📊" },
  { id: "ai", name: "AI", icon: "🤖" },
];

const ENABLED_TOOLS = new Map<string, UserTool>();

export const ToolService = {
  async getCategories(): Promise<ToolCategoryInfo[]> {
    await new Promise((r) => setTimeout(r, 100));
    return TOOL_CATEGORIES;
  },

  async getTools(
    category?: string,
    keyword?: string,
    sortBy: "popular" | "successRate" | "newest" = "popular",
  ): Promise<ToolMarketItem[]> {
    await new Promise((r) => setTimeout(r, 200));
    let filtered = [...MOCK_TOOLS];

    if (category && category !== "all") {
      filtered = filtered.filter((t) => t.category === category);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.description.toLowerCase().includes(kw),
      );
    }

    if (sortBy === "popular") {
      filtered.sort((a, b) => b.usageCount - a.usageCount);
    } else if (sortBy === "successRate") {
      filtered.sort((a, b) => b.successRate - a.successRate);
    } else if (sortBy === "newest") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return filtered.map((t) => ({
      ...t,
      isEnabled: ENABLED_TOOLS.has(t.id),
    }));
  },

  async getToolById(toolId: string): Promise<ToolMarketItem | null> {
    await new Promise((r) => setTimeout(r, 100));
    const tool = MOCK_TOOLS.find((t) => t.id === toolId);
    if (!tool) return null;
    return {
      ...tool,
      isEnabled: ENABLED_TOOLS.has(tool.id),
    };
  },

  async getMyTools(): Promise<UserTool[]> {
    await new Promise((r) => setTimeout(r, 100));
    return Array.from(ENABLED_TOOLS.values());
  },

  async addTool(toolId: string, credentials?: AuthConfig): Promise<UserTool> {
    await new Promise((r) => setTimeout(r, 200));
    const userTool: UserTool = {
      id: `user-tool-${Date.now()}`,
      toolId,
      userId: "current-user",
      credentials,
      config: {},
      enabled: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ENABLED_TOOLS.set(toolId, userTool);
    return userTool;
  },

  async removeTool(toolId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    ENABLED_TOOLS.delete(toolId);
  },

  async updateToolCredentials(
    toolId: string,
    credentials: AuthConfig,
  ): Promise<UserTool> {
    await new Promise((r) => setTimeout(r, 200));
    const existing = ENABLED_TOOLS.get(toolId);
    if (!existing) {
      throw new Error("Tool not found");
    }
    const updated: UserTool = {
      ...existing,
      credentials,
      updatedAt: new Date().toISOString(),
    };
    ENABLED_TOOLS.set(toolId, updated);
    return updated;
  },

  async testTool(toolId: string): Promise<ToolTestResult> {
    await new Promise((r) => setTimeout(r, 500));
    const tool = MOCK_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return {
        success: false,
        responseTime: 0,
        error: "Tool not found",
      };
    }
    return {
      success: true,
      responseTime: Math.floor(Math.random() * 500) + 100,
      response: { status: "ok", message: "Test successful" },
    };
  },
};

export default ToolService;
