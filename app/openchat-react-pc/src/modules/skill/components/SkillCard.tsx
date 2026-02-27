import type { SkillMarketItem } from "../entities/skill.entity";

interface SkillCardProps {
  skill: SkillMarketItem;
  onEnable?: (skillId: string) => void;
  onDisable?: (skillId: string) => void;
  onClick?: () => void;
}

export function SkillCard({
  skill,
  onEnable,
  onDisable,
  onClick,
}: SkillCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-bg-secondary border border-border rounded-xl hover:border-primary/50 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 flex items-center justify-center bg-bg-tertiary rounded-xl text-2xl">
          {skill.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {skill.name}
          </h3>
          <p className="text-xs text-text-muted">
            {skill.provider} · v{skill.version}
          </p>
        </div>
      </div>
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
        {skill.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {skill.rating.toFixed(1)}
          </span>
          <span>{skill.usageCount.toLocaleString()} 次使用</span>
        </div>
        {skill.isEnabled ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDisable?.(skill.id);
            }}
            className="px-3 py-1 text-xs bg-success/10 text-success rounded-lg"
          >
            已启用
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnable?.(skill.id);
            }}
            className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            启用
          </button>
        )}
      </div>
    </div>
  );
}

export default SkillCard;
