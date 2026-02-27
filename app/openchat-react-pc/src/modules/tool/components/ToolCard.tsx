import type { ToolMarketItem } from "../entities/tool.entity";

interface ToolCardProps {
  tool: ToolMarketItem;
  onAdd?: (toolId: string) => void;
  onConfigure?: (toolId: string) => void;
  onClick?: () => void;
}

export function ToolCard({ tool, onAdd, onConfigure, onClick }: ToolCardProps) {
  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-100 text-blue-700";
      case "POST":
        return "bg-green-100 text-green-700";
      case "PUT":
        return "bg-yellow-100 text-yellow-700";
      case "DELETE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-4 bg-bg-secondary border border-border rounded-xl hover:border-primary/50 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 flex items-center justify-center bg-bg-tertiary rounded-xl text-2xl">
          {tool.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">
            {tool.name}
          </h3>
          <p className="text-xs text-text-muted">
            {tool.provider} · v{tool.version}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded ${getMethodColor(tool.method)}`}
        >
          {tool.method}
        </span>
      </div>
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
        {tool.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{(tool.successRate * 100).toFixed(0)}% 成功率</span>
          <span>{tool.usageCount.toLocaleString()} 次使用</span>
        </div>
        {tool.isEnabled ? (
          <span className="px-3 py-1 text-xs bg-success/10 text-success rounded-lg">
            已添加
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.(tool.id);
            }}
            className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            添加
          </button>
        )}
      </div>
    </div>
  );
}

export default ToolCard;
