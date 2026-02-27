import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToolService } from "../services/tool.service";
import type { ToolMarketItem, UserTool } from "../entities/tool.entity";
import { Button } from "@/components/ui/Button";

interface MyToolItem extends ToolMarketItem {
  userTool: UserTool;
}

export function MyToolsPage() {
  const navigate = useNavigate();
  const [myTools, setMyTools] = useState<MyToolItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMyTools();
  }, []);

  const loadMyTools = async () => {
    setIsLoading(true);
    const allTools = await ToolService.getTools();
    const myUserTools = await ToolService.getMyTools();
    const enabledTools = allTools.filter((t) => t.isEnabled);
    const myToolItems: MyToolItem[] = enabledTools.map((tool) => ({
      ...tool,
      userTool:
        myUserTools.find((u) => u.toolId === tool.id) ||
        ({
          id: "",
          toolId: tool.id,
          userId: "current-user",
          config: {},
          enabled: true,
          usageCount: 0,
          createdAt: "",
          updatedAt: "",
        } as UserTool),
    }));
    setMyTools(myToolItems);
    setIsLoading(false);
  };

  const handleRemove = async (toolId: string) => {
    await ToolService.removeTool(toolId);
    loadMyTools();
  };

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
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mr-4">
              <span className="text-xl">🛠️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">我的工具</h1>
              <p className="text-xs text-text-muted mt-0.5">
                管理已添加的 API 工具
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/tools/api")}>
            <span className="mr-2">+</span>
            添加工具
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
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
                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
              />
            </svg>
            <p className="text-lg font-medium text-text-primary mb-2">
              暂无工具
            </p>
            <p className="text-sm mb-4">去工具市场添加一些工具吧</p>
            <Button onClick={() => navigate("/tools/api")}>浏览工具市场</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between p-4 bg-bg-secondary border border-border rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-bg-tertiary rounded-xl text-2xl">
                    {tool.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-primary">
                        {tool.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${getMethodColor(
                          tool.method,
                        )}`}
                      >
                        {tool.method}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      {tool.description}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      使用次数: {tool.userTool.usageCount}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-xs bg-success/10 text-success rounded-lg">
                    已启用
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/tools/configure/${tool.id}`)}
                  >
                    配置
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(tool.id)}
                  >
                    移除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyToolsPage;
