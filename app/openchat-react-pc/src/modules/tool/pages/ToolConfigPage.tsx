import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToolService } from "../services/tool.service";
import type { ToolMarketItem, AuthConfig } from "../entities/tool.entity";
import { Button } from "@/components/ui/Button";

export function ToolConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<ToolMarketItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    type: "none",
    apiKey: "",
    token: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (id) {
      loadTool(id);
    }
  }, [id]);

  const loadTool = async (toolId: string) => {
    setIsLoading(true);
    const data = await ToolService.getToolById(toolId);
    setTool(data);
    if (data?.auth) {
      setAuthConfig(data.auth);
    }
    setIsLoading(false);
  };

  const handleTest = async () => {
    if (!id) return;
    setIsTesting(true);
    setTestResult(null);
    const result = await ToolService.testTool(id);
    setTestResult({
      success: result.success,
      message: result.success
        ? `测试成功！响应时间: ${result.responseTime}ms`
        : result.error || "测试失败",
    });
    setIsTesting(false);
  };

  const handleSave = async () => {
    if (!id) return;
    await ToolService.updateToolCredentials(id, authConfig);
    navigate("/tools/my");
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted">
        <p>工具不存在</p>
        <Button
          variant="ghost"
          onClick={() => navigate("/tools/api")}
          className="mt-4"
        >
          返回工具市场
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex-shrink-0 px-6 py-5 border-b border-border bg-bg-secondary">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/tools/my")}
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
          <div className="w-10 h-10 flex items-center justify-center bg-bg-tertiary rounded-xl text-2xl mr-3">
            {tool.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{tool.name}</h1>
            <p className="text-xs text-text-muted">{tool.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              API 配置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  端点
                </label>
                <input
                  value={tool.endpoint}
                  disabled
                  className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-muted"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  请求方法
                </label>
                <input
                  value={tool.method}
                  disabled
                  className="w-24 h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-muted"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              认证配置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-2">
                  认证方式
                </label>
                <select
                  value={authConfig.type}
                  onChange={(e) =>
                    setAuthConfig({
                      ...authConfig,
                      type: e.target.value as AuthConfig["type"],
                    })
                  }
                  className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary"
                >
                  <option value="none">无</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>

              {authConfig.type === "api_key" && (
                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={authConfig.apiKey || ""}
                    onChange={(e) =>
                      setAuthConfig({ ...authConfig, apiKey: e.target.value })
                    }
                    placeholder="输入 API Key"
                    className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted"
                  />
                </div>
              )}

              {authConfig.type === "bearer" && (
                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    Token
                  </label>
                  <input
                    type="password"
                    value={authConfig.token || ""}
                    onChange={(e) =>
                      setAuthConfig({ ...authConfig, token: e.target.value })
                    }
                    placeholder="输入 Bearer Token"
                    className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted"
                  />
                </div>
              )}

              {authConfig.type === "basic" && (
                <>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={authConfig.username || ""}
                      onChange={(e) =>
                        setAuthConfig({
                          ...authConfig,
                          username: e.target.value,
                        })
                      }
                      placeholder="输入用户名"
                      className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      密码
                    </label>
                    <input
                      type="password"
                      value={authConfig.password || ""}
                      onChange={(e) =>
                        setAuthConfig({
                          ...authConfig,
                          password: e.target.value,
                        })
                      }
                      placeholder="输入密码"
                      className="w-full h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-6 bg-bg-secondary border border-border rounded-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              测试连接
            </h3>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? "测试中..." : "测试连接"}
              </Button>
              {testResult && (
                <span
                  className={`text-sm ${testResult.success ? "text-success" : "text-error"}`}
                >
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate("/tools/my")}>
              取消
            </Button>
            <Button onClick={handleSave}>保存配置</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolConfigPage;
