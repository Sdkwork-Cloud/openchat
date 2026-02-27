/**
 * 设置页面 - 使用统一主题变量
 *
 * 布局：
 * - 左侧：280px 设置菜单
 * - 右侧：自适应 设置内容
 */

import { useState } from "react";
import { useAuthContext } from "../app/AppProvider";
import { ThemeSelector } from "../components/ui/ThemeSelector";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

type SettingTab =
  | "account"
  | "imconfig"
  | "general"
  | "notifications"
  | "privacy"
  | "about";

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: "toggle" | "button" | "select" | "link" | "text" | "custom";
  value?: boolean | string;
  options?: { label: string; value: string }[];
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const settingsData: Record<
  Exclude<SettingTab, "account" | "imconfig">,
  SettingSection[]
> = {
  general: [
    {
      title: "通用",
      items: [
        {
          id: "language",
          label: "语言",
          type: "select",
          value: "zh-CN",
          options: [
            { label: "简体中文", value: "zh-CN" },
            { label: "繁體中文", value: "zh-TW" },
            { label: "English", value: "en-US" },
          ],
        },
        {
          id: "auto-start",
          label: "开机自动启动",
          type: "toggle",
          value: true,
        },
        {
          id: "minimize-tray",
          label: "关闭窗口时最小化到托盘",
          type: "toggle",
          value: true,
        },
      ],
    },
    {
      title: "主题",
      items: [
        { id: "theme-selector", label: "主题颜色", type: "custom" },
        {
          id: "font-size",
          label: "字体大小",
          type: "select",
          value: "medium",
          options: [
            { label: "小", value: "small" },
            { label: "中", value: "medium" },
            { label: "大", value: "large" },
          ],
        },
      ],
    },
  ],
  notifications: [
    {
      title: "消息通知",
      items: [
        {
          id: "message-notify",
          label: "接收新消息通知",
          type: "toggle",
          value: true,
        },
        { id: "sound", label: "声音提醒", type: "toggle", value: true },
        { id: "vibrate", label: "振动", type: "toggle", value: false },
        {
          id: "preview",
          label: "通知预览",
          type: "toggle",
          value: true,
          description: "在通知中显示消息内容",
        },
      ],
    },
    {
      title: "勿扰模式",
      items: [
        { id: "dnd", label: "开启勿扰模式", type: "toggle", value: false },
        {
          id: "dnd-time",
          label: "定时开启",
          type: "button",
          value: "22:00 - 08:00",
        },
      ],
    },
  ],
  privacy: [
    {
      title: "隐私",
      items: [
        {
          id: "online-status",
          label: "向好友展示在线状态",
          type: "toggle",
          value: true,
        },
        { id: "read-receipt", label: "已读回执", type: "toggle", value: true },
        {
          id: "add-me",
          label: "允许通过OpenChat号添加我",
          type: "toggle",
          value: true,
        },
      ],
    },
    {
      title: "黑名单",
      items: [
        {
          id: "blacklist",
          label: "通讯录黑名单",
          type: "link",
          description: "3人",
        },
      ],
    },
  ],
  about: [
    {
      title: "关于 OpenChat",
      items: [
        { id: "version", label: "版本号", type: "button", value: "1.0.0" },
        { id: "update", label: "检查更新", type: "link" },
        { id: "feedback", label: "反馈问题", type: "link" },
        { id: "privacy", label: "隐私政策", type: "link" },
        { id: "terms", label: "服务条款", type: "link" },
      ],
    },
  ],
};

const menuItems: { id: SettingTab; label: string; icon: string }[] = [
  {
    id: "account",
    label: "账号设置",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  { id: "imconfig", label: "IM 配置", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  {
    id: "general",
    label: "通用设置",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    id: "notifications",
    label: "消息通知",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    id: "privacy",
    label: "隐私",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    id: "about",
    label: "关于",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

/**
 * 设置项组件
 */
function SettingItemComponent({ item }: { item: SettingItem }) {
  const [value, setValue] = useState(item.value);

  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-light)] last:border-0">
      <div className="flex flex-col">
        <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
        {item.description && (
          <span className="text-xs text-[var(--text-muted)] mt-0.5">
            {item.description}
          </span>
        )}
      </div>

      <div className="flex items-center">
        {item.type === "toggle" && (
          <button
            onClick={() => setValue(!value)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value
                ? "bg-[var(--ai-primary)]"
                : "bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                value ? "left-6" : "left-1"
              }`}
            />
          </button>
        )}

        {item.type === "button" && (
          <div className="flex items-center text-sm text-[var(--text-tertiary)]">
            <span>{value}</span>
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}

        {item.type === "link" && (
          <svg
            className="w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}

        {item.type === "text" && (
          <span className="text-sm text-[var(--text-tertiary)]">{value}</span>
        )}

        {item.type === "select" && (
          <select
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            className="text-sm text-[var(--text-tertiary)] bg-transparent border-none outline-none cursor-pointer"
          >
            {item.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {item.type === "custom" && item.id === "theme-selector" && (
          <ThemeSelector size="small" />
        )}
      </div>
    </div>
  );
}

/**
 * 账号设置面板
 */
function AccountPanel() {
  const { user } = useAuthContext();

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white font-semibold text-2xl shadow-lg shadow-primary/20">
            {user?.nickname?.[0] || user?.uid?.[0] || "U"}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">
              {user?.nickname || user?.uid}
            </h3>
            <p className="text-sm text-text-muted">OpenChat号: {user?.uid}</p>
            {user?.phone && (
              <p className="text-sm text-text-muted">手机: {user.phone}</p>
            )}
          </div>
          <Button variant="outline" size="sm">
            编辑资料
          </Button>
        </div>
      </Card>

      {/* 账号信息 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-3 bg-bg-secondary border-b border-border">
          <h3 className="text-sm font-medium text-text-secondary">账号信息</h3>
        </div>
        <div className="px-6">
          <SettingItemComponent
            item={{
              id: "uid",
              label: "用户 ID",
              type: "text",
              value: user?.uid || "",
            }}
          />
          <SettingItemComponent
            item={{
              id: "token",
              label: "认证 Token",
              type: "text",
              value: "********",
            }}
          />
        </div>
      </Card>

      {/* 安全设置 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-3 bg-bg-secondary border-b border-border">
          <h3 className="text-sm font-medium text-text-secondary">安全设置</h3>
        </div>
        <div className="px-6">
          <SettingItemComponent
            item={{ id: "password", label: "修改密码", type: "link" }}
          />
          <SettingItemComponent
            item={{
              id: "2fa",
              label: "两步验证",
              type: "toggle",
              value: false,
            }}
          />
          <SettingItemComponent
            item={{ id: "devices", label: "登录设备管理", type: "link" }}
          />
        </div>
      </Card>
    </div>
  );
}

/**
 * IM 配置面板
 */
function IMConfigPanel() {
  const { imConfig, updateIMConfig } = useAuthContext();
  const [serverUrl, setServerUrl] = useState(imConfig?.serverUrl || "");
  const [deviceId, setDeviceId] = useState(imConfig?.deviceId || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateIMConfig({
      serverUrl: serverUrl.trim(),
      deviceId: deviceId.trim() || undefined,
      deviceFlag: "PC",
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* 当前配置 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            IM 服务端配置
          </h3>
          <Button
            variant={isEditing ? "ghost" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "取消" : "编辑"}
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                服务器地址
                <span className="text-text-muted text-xs ml-1">
                  (WebSocket)
                </span>
              </label>
              <Input
                value={serverUrl}
                onChange={(val) => setServerUrl(val)}
                placeholder="ws://localhost:5200"
              />
              <p className="text-xs text-text-muted mt-1">
                例如：ws://localhost:5200 或 wss://im.example.com
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                设备 ID
                <span className="text-text-muted text-xs ml-1">(可选)</span>
              </label>
              <Input
                value={deviceId}
                onChange={(val) => setDeviceId(val)}
                placeholder="自定义设备 ID"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
              <span className="text-sm text-text-secondary">服务器地址</span>
              <span className="text-sm text-text-primary font-mono">
                {imConfig?.serverUrl || "未配置"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
              <span className="text-sm text-text-secondary">设备标识</span>
              <span className="text-sm text-text-primary">
                {imConfig?.deviceFlag || "PC"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
              <span className="text-sm text-text-secondary">设备 ID</span>
              <span className="text-sm text-text-primary font-mono">
                {imConfig?.deviceId || "自动分配"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* 说明 */}
      <div className="bg-primary-soft rounded-xl border border-primary/20 p-4">
        <h4 className="text-sm font-medium text-primary mb-2">配置说明</h4>
        <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
          <li>服务器地址：WuKongIM 的 WebSocket 连接地址</li>
          <li>格式：ws://host:port (非加密) 或 wss://host:port (加密)</li>
          <li>默认端口：5200</li>
          <li>修改配置后需要重新登录才能生效</li>
        </ul>
        <p className="text-xs text-text-muted mt-3">
          参考文档：
          <a
            href="https://docs.githubim.com/zh/sdk/easy/ios/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            WuKongIM SDK 文档
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * 设置页面
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>("account");
  const { logout } = useAuthContext();

  const currentSettings =
    activeTab === "account" || activeTab === "imconfig"
      ? null
      : settingsData[activeTab];

  return (
    <>
      {/* 左侧菜单 - 280px */}
      <div className="w-[280px] bg-bg-secondary border-r border-border flex flex-col h-full backdrop-blur-md">
        {/* 标题 */}
        <div className="h-[60px] flex items-center px-5 border-b border-border">
          <h1 className="text-base font-semibold text-text-primary">设置</h1>
        </div>

        {/* 菜单列表 */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-5 py-3 transition-colors ${
                activeTab === item.id
                  ? "bg-primary-soft border-l-2 border-primary"
                  : "hover:bg-bg-hover border-l-2 border-transparent"
              }`}
            >
              <svg
                className={`w-5 h-5 mr-3 ${
                  activeTab === item.id ? "text-primary" : "text-text-tertiary"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={item.icon}
                />
              </svg>
              <span
                className={`text-sm ${
                  activeTab === item.id
                    ? "text-text-primary font-medium"
                    : "text-text-tertiary"
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* 退出登录 */}
        <div className="p-4 border-t border-border">
          <Button variant="danger" onClick={logout} className="w-full">
            退出登录
          </Button>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
        {/* 头部 */}
        <div className="h-[60px] bg-bg-secondary border-b border-border flex items-center px-5 backdrop-blur-md">
          <h2 className="font-medium text-text-primary text-base">
            {menuItems.find((m) => m.id === activeTab)?.label}
          </h2>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-border-medium">
          <div className="max-w-2xl mx-auto animate-fade-in">
            {activeTab === "account" && <AccountPanel />}
            {activeTab === "imconfig" && <IMConfigPanel />}
            {currentSettings && (
              <div className="space-y-6">
                {currentSettings.map((section, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="px-6 py-3 bg-bg-secondary border-b border-border">
                      <h3 className="text-sm font-medium text-text-secondary">
                        {section.title}
                      </h3>
                    </div>
                    <div className="px-6">
                      {section.items.map((item) => (
                        <SettingItemComponent key={item.id} item={item} />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "about" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  OpenChat
                </h3>
                <p className="text-sm text-text-muted mt-1">让沟通更简单</p>
                <p className="text-xs text-text-muted mt-4">
                  © 2024 OpenChat Team
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsPage;
