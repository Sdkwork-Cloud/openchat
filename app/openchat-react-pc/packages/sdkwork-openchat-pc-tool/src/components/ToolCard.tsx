import type { ToolMarketItem } from "../entities/tool.entity";

interface ToolCardProps {
  tool: ToolMarketItem;
  onAdd?: (toolId: string) => void;
  onConfigure?: (toolId: string) => void;
  onClick?: () => void;
}

function methodBadgeClass(method: string): string {
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
}

export function ToolCard({ tool, onAdd, onClick }: ToolCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-bg-secondary p-4 transition-all hover:border-primary/50"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary text-2xl">
          {tool.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-text-primary">{tool.name}</h3>
          <p className="text-xs text-text-muted">
            {tool.provider} | v{tool.version}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs ${methodBadgeClass(tool.method)}`}>
          {tool.method}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-text-secondary">{tool.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{(tool.successRate * 100).toFixed(0)}% success</span>
          <span>{tool.usageCount.toLocaleString()} calls</span>
        </div>
        {tool.isEnabled ? (
          <span className="rounded-lg bg-success/10 px-3 py-1 text-xs text-success">Enabled</span>
        ) : (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAdd?.(tool.id);
            }}
            className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary-hover"
          >
            Enable
          </button>
        )}
      </div>
    </div>
  );
}

export default ToolCard;
