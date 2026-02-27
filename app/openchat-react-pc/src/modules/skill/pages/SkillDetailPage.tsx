import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SkillService } from "../services/skill.service";
import type { SkillMarketItem } from "../entities/skill.entity";
import { Button } from "@/components/ui/Button";

export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillMarketItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSkill(id);
    }
  }, [id]);

  const loadSkill = async (skillId: string) => {
    setIsLoading(true);
    const data = await SkillService.getSkillById(skillId);
    setSkill(data);
    setIsLoading(false);
  };

  const handleEnable = async () => {
    if (!id || !skill) return;
    await SkillService.enableSkill(id);
    loadSkill(id);
  };

  const handleDisable = async () => {
    if (!id) return;
    await SkillService.disableSkill(id);
    if (id) loadSkill(id);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted">
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium text-text-primary mb-2">技能不存在</p>
        <p className="text-sm mb-4">该技能可能已被删除或下架</p>
        <Button variant="outline" onClick={() => navigate("/skills")}>
          返回技能市场
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/skills")}
            className="mr-4 p-2 hover:bg-bg-hover rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div className="w-14 h-14 flex items-center justify-center bg-bg-tertiary rounded-xl text-3xl mr-4">
            {skill.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-primary">
                {skill.name}
              </h1>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                v{skill.version}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1">{skill.provider}</p>
          </div>
          <div className="flex items-center gap-3">
            {skill.isEnabled ? (
              <Button variant="outline" onClick={handleDisable}>
                已启用
              </Button>
            ) : (
              <Button onClick={handleEnable}>启用技能</Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-bg-secondary border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <span className="text-sm text-text-muted">评分</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {skill.rating.toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-bg-secondary border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span className="text-sm text-text-muted">使用次数</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {skill.usageCount.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-bg-secondary border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span className="text-sm text-text-muted">分类</span>
              </div>
              <p className="text-2xl font-bold text-text-primary capitalize">
                {skill.category}
              </p>
            </div>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              技能描述
            </h3>
            <p className="text-text-secondary leading-relaxed">
              {skill.description}
            </p>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              能力
            </h3>
            <div className="flex flex-wrap gap-2">
              {skill.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-lg"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-bg-tertiary text-text-secondary text-sm rounded-lg"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              使用说明
            </h3>
            <div className="space-y-3 text-text-secondary">
              <p>1. 启用此技能后，Agent 将自动获得该技能的能力</p>
              <p>2. 在与 Agent 对话时，可以直接使用该技能提供的功能</p>
              <p>3. 如需配置技能参数，可以在 Agent 详情页进行设置</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillDetailPage;
