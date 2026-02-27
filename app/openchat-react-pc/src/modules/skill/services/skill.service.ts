import {
  Skill,
  SkillCategory,
  UserSkill,
  SkillMarketItem,
  SkillCategoryInfo,
} from "../entities/skill.entity";

const MOCK_SKILLS: SkillMarketItem[] = [
  {
    id: "skill-1",
    name: "AI 绘图",
    description: "使用 AI 生成精美图片，支持多种风格",
    icon: "🎨",
    category: SkillCategory.CREATIVE,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["text-to-image", "image-edit", "style-transfer"],
    tags: ["AI", "绘图", "创意"],
    usageCount: 12500,
    rating: 4.8,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "skill-2",
    name: "代码执行",
    description: "运行代码并返回执行结果，支持多种编程语言",
    icon: "💻",
    category: SkillCategory.DEVELOPER,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["run-code", "sandbox", "debug"],
    tags: ["代码", "开发", "编程"],
    usageCount: 8900,
    rating: 4.7,
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-03-05T00:00:00Z",
  },
  {
    id: "skill-3",
    name: "网页搜索",
    description: "搜索互联网信息，获取实时数据和新闻",
    icon: "🔍",
    category: SkillCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["search", "crawl", "extract"],
    tags: ["搜索", "工具", "信息"],
    usageCount: 15000,
    rating: 4.9,
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "skill-4",
    name: "数据可视化",
    description: "生成图表和数据可视化，支持多种图表类型",
    icon: "📊",
    category: SkillCategory.DATA,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["chart", "visualization", "dashboard"],
    tags: ["数据", "图表", "分析"],
    usageCount: 5600,
    rating: 4.6,
    createdAt: "2024-02-10T00:00:00Z",
    updatedAt: "2024-03-12T00:00:00Z",
  },
  {
    id: "skill-5",
    name: "翻译",
    description: "多语言翻译，支持 100+ 语言",
    icon: "🌐",
    category: SkillCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["translate", "detect", "transliterate"],
    tags: ["翻译", "语言", "沟通"],
    usageCount: 11000,
    rating: 4.8,
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "skill-6",
    name: "视频生成",
    description: "AI 生成视频，支持文生视频和图生视频",
    icon: "🎬",
    category: SkillCategory.MEDIA,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["text-to-video", "image-to-video", "video-edit"],
    tags: ["AI", "视频", "媒体"],
    usageCount: 7800,
    rating: 4.7,
    createdAt: "2024-02-20T00:00:00Z",
    updatedAt: "2024-03-18T00:00:00Z",
  },
  {
    id: "skill-7",
    name: "语音合成",
    description: "将文本转换为自然语音，支持多种音色",
    icon: "🎤",
    category: SkillCategory.MEDIA,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["tts", "voice-clone", "emotion"],
    tags: ["语音", "TTS", "音频"],
    usageCount: 4500,
    rating: 4.5,
    createdAt: "2024-02-25T00:00:00Z",
    updatedAt: "2024-03-20T00:00:00Z",
  },
  {
    id: "skill-8",
    name: "文档解析",
    description: "解析 PDF、Word 等文档，提取关键信息",
    icon: "📄",
    category: SkillCategory.UTILITY,
    version: "1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["parse-pdf", "extract-text", "ocr"],
    tags: ["文档", "解析", "提取"],
    usageCount: 6200,
    rating: 4.6,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-22T00:00:00Z",
  },
];

const SKILL_CATEGORIES: SkillCategoryInfo[] = [
  { id: "all", name: "全部", icon: "📦" },
  { id: "creative", name: "创意", icon: "🎨" },
  { id: "utility", name: "工具", icon: "🔧" },
  { id: "developer", name: "开发", icon: "💻" },
  { id: "data", name: "数据", icon: "📊" },
  { id: "media", name: "媒体", icon: "🎬" },
];

const ENABLED_SKILLS = new Set<string>();

export const SkillService = {
  async getCategories(): Promise<SkillCategoryInfo[]> {
    await new Promise((r) => setTimeout(r, 100));
    return SKILL_CATEGORIES;
  },

  async getSkills(
    category?: string,
    keyword?: string,
    sortBy: "popular" | "rating" | "newest" = "popular",
  ): Promise<SkillMarketItem[]> {
    await new Promise((r) => setTimeout(r, 200));
    let filtered = [...MOCK_SKILLS];

    if (category && category !== "all") {
      filtered = filtered.filter((s) => s.category === category);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.description.toLowerCase().includes(kw) ||
          s.tags.some((t) => t.toLowerCase().includes(kw)),
      );
    }

    if (sortBy === "popular") {
      filtered.sort((a, b) => b.usageCount - a.usageCount);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "newest") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return filtered.map((s) => ({
      ...s,
      isEnabled: ENABLED_SKILLS.has(s.id),
    }));
  },

  async getSkillById(skillId: string): Promise<SkillMarketItem | null> {
    await new Promise((r) => setTimeout(r, 100));
    const skill = MOCK_SKILLS.find((s) => s.id === skillId);
    if (!skill) return null;
    return {
      ...skill,
      isEnabled: ENABLED_SKILLS.has(skill.id),
    };
  },

  async getMySkills(): Promise<UserSkill[]> {
    await new Promise((r) => setTimeout(r, 100));
    return [];
  },

  async enableSkill(skillId: string): Promise<UserSkill> {
    await new Promise((r) => setTimeout(r, 200));
    ENABLED_SKILLS.add(skillId);
    return {
      id: `user-skill-${Date.now()}`,
      skillId,
      userId: "current-user",
      config: {},
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async disableSkill(skillId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    ENABLED_SKILLS.delete(skillId);
  },

  async updateSkillConfig(
    skillId: string,
    config: Record<string, unknown>,
  ): Promise<UserSkill> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      id: `user-skill-${skillId}`,
      skillId,
      userId: "current-user",
      config,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};

export default SkillService;
