import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@sdkwork/openchat-pc-auth";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import { useTheme, type ThemeType as UIThemeType } from "@sdkwork/openchat-pc-ui";
import { FeedbackResultService, SettingsResultService } from "../services";
import type { AppInfo, FeedbackSupportInfo, SettingsState } from "../types";

type SettingTab =
  | "account"
  | "imconfig"
  | "general"
  | "notifications"
  | "privacy"
  | "about";

type DeviceFlag = "PC" | "WEB" | "DESKTOP";

interface IMConfigDraft {
  wsUrl: string;
  serverUrl: string;
  deviceId: string;
  deviceFlag: DeviceFlag;
  uid: string;
  token: string;
}

const IM_CONFIG_STORAGE_KEY = "openchat:im-config";
const DEV_AUTO_LOGIN_KEY = "openchat_dev_auto_login_disabled";

const defaultSettings: SettingsState = {
  theme: "blue",
  notifications: {
    messagePreview: true,
    messageSound: true,
    messageVibration: false,
    groupMessage: true,
    groupMention: true,
    systemUpdates: true,
    marketingEmails: false,
    doNotDisturb: false,
    doNotDisturbStart: "23:00",
    doNotDisturbEnd: "08:00",
  },
  privacy: {
    onlineStatus: "contacts",
    lastSeen: "contacts",
    profilePhoto: "everyone",
    phoneNumber: "contacts",
    addByPhone: true,
    addByUsername: true,
    addByQRCode: true,
    readReceipts: true,
    screenshotNotification: false,
  },
  preferences: {
    language: "zh-CN",
    fontSize: "medium",
    compactMode: false,
    mediaQuality: "auto",
    autoDownload: {
      images: true,
      videos: false,
      files: false,
    },
  },
  modelConfigs: [],
};

const defaultAppInfo: AppInfo = {
  version: "1.0.0",
  buildNumber: "local",
  platform: "web",
  updateAvailable: false,
};

const defaultFeedbackSupportInfo: FeedbackSupportInfo = {
  email: "support@example.com",
  workingHours: "Mon-Fri 09:00-18:00",
};

const defaultIMConfig: IMConfigDraft = {
  wsUrl:
    (import.meta.env.VITE_IM_WS_URL as string | undefined) ??
    (import.meta.env.VITE_APP_IM_WS_URL as string | undefined) ??
    "",
  serverUrl: "",
  deviceId: "",
  deviceFlag: "PC",
  uid: localStorage.getItem("uid") ?? "",
  token: localStorage.getItem("token") ?? "",
};

function loadIMConfig(): IMConfigDraft {
  try {
    const raw = localStorage.getItem(IM_CONFIG_STORAGE_KEY);
    if (!raw) {
      return defaultIMConfig;
    }

    const parsed = JSON.parse(raw) as Partial<IMConfigDraft>;
    return {
      wsUrl: typeof parsed.wsUrl === "string" ? parsed.wsUrl : defaultIMConfig.wsUrl,
      serverUrl: typeof parsed.serverUrl === "string" ? parsed.serverUrl : defaultIMConfig.serverUrl,
      deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : defaultIMConfig.deviceId,
      deviceFlag:
        parsed.deviceFlag === "WEB" || parsed.deviceFlag === "DESKTOP"
          ? parsed.deviceFlag
          : "PC",
      uid: typeof parsed.uid === "string" ? parsed.uid : defaultIMConfig.uid,
      token: typeof parsed.token === "string" ? parsed.token : defaultIMConfig.token,
    };
  } catch (error) {
    console.warn("Failed to parse local IM config, using defaults.", error);
    return defaultIMConfig;
  }
}

function persistIMConfig(next: IMConfigDraft): void {
  localStorage.setItem(IM_CONFIG_STORAGE_KEY, JSON.stringify(next));
  if (next.uid.trim()) {
    localStorage.setItem("uid", next.uid.trim());
  }
  if (next.token.trim()) {
    localStorage.setItem("token", next.token.trim());
  }
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-bg-tertiary"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function isUITheme(value: string): value is UIThemeType {
  return value === "light" || value === "dark" || value === "blue" || value === "purple" || value === "system";
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>("account");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [appInfo, setAppInfo] = useState<AppInfo>(defaultAppInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [imDraft, setImDraft] = useState<IMConfigDraft>(() => loadIMConfig());
  const [devAutoLoginDisabled, setDevAutoLoginDisabled] = useState(
    () => localStorage.getItem(DEV_AUTO_LOGIN_KEY) === "true",
  );
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSupport, setFeedbackSupport] = useState<FeedbackSupportInfo>(
    defaultFeedbackSupportInfo,
  );

  const { user, logout } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const [settingsRes, appInfoRes] = await Promise.all([
          SettingsResultService.getSettings(),
          SettingsResultService.getAppInfo(),
        ]);

        if (cancelled) {
          return;
        }

        if (settingsRes.success && settingsRes.data) {
          const merged: SettingsState = {
            ...defaultSettings,
            ...settingsRes.data,
            notifications: {
              ...defaultSettings.notifications,
              ...(settingsRes.data.notifications || {}),
            },
            privacy: {
              ...defaultSettings.privacy,
              ...(settingsRes.data.privacy || {}),
            },
            preferences: {
              ...defaultSettings.preferences,
              ...(settingsRes.data.preferences || {}),
              autoDownload: {
                ...defaultSettings.preferences.autoDownload,
                ...(settingsRes.data.preferences?.autoDownload || {}),
              },
            },
          };

          setSettings(merged);
          if (isUITheme(merged.theme)) {
            setTheme(merged.theme);
          }
        }

        if (appInfoRes.success && appInfoRes.data) {
          setAppInfo((prev) => ({ ...prev, ...appInfoRes.data }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load settings data.", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedbackSupport() {
      try {
        const result = await FeedbackResultService.getFeedbackSupportInfo();
        if (cancelled || !result.success || !result.data) {
          return;
        }
        setFeedbackSupport((prev) => ({ ...prev, ...result.data }));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load feedback support info.", error);
        }
      }
    }

    void loadFeedbackSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo<Array<{ id: SettingTab; label: string }>>(
    () => [
      { id: "account", label: "Account" },
      { id: "imconfig", label: "IM Config" },
      { id: "general", label: "General" },
      { id: "notifications", label: "Notifications" },
      { id: "privacy", label: "Privacy" },
      { id: "about", label: "About" },
    ],
    [],
  );

  const showSettingsSave =
    activeTab === "general" || activeTab === "notifications" || activeTab === "privacy";

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const result = await SettingsResultService.updateSettings(settings);
      if (!result.success) {
        setSaveMessage(result.error || result.message || "Save failed. Local changes are still in memory.");
        return;
      }

      if (result.data) {
        setSettings(result.data);
      }
      setSaveMessage("Settings saved.");
    } catch (error) {
      console.error("Failed to save settings.", error);
      setSaveMessage("Save failed. Local changes are still in memory.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIMConfig = () => {
    const next: IMConfigDraft = {
      wsUrl: imDraft.wsUrl.trim(),
      serverUrl: imDraft.serverUrl.trim(),
      deviceId: imDraft.deviceId.trim(),
      deviceFlag: imDraft.deviceFlag,
      uid: imDraft.uid.trim(),
      token: imDraft.token.trim(),
    };

    persistIMConfig(next);
    setImDraft(next);
    window.dispatchEvent(
      new CustomEvent("openchat:im-config-updated", {
        detail: next,
      }),
    );
    setSaveMessage("IM config saved to local profile.");
  };

  const handleToggleDevAutoLogin = (enabled: boolean) => {
    if (enabled) {
      localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
      setDevAutoLoginDisabled(false);
      setSaveMessage("Dev auto-login enabled.");
      return;
    }

    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
    setDevAutoLoginDisabled(true);
    setSaveMessage("Dev auto-login disabled.");
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const next = await SettingsResultService.checkForUpdates();
      if (!next.success || !next.data) {
        setSaveMessage(next.error || next.message || "Update check failed.");
        return;
      }

      setAppInfo((prev) => ({ ...prev, ...next.data }));
      setSaveMessage(next.data.updateAvailable ? "New version detected." : "You are up to date.");
    } catch (error) {
      console.error("Failed to check updates.", error);
      setSaveMessage("Update check failed.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSubmitFeedback = async () => {
    const content = feedbackContent.trim();
    if (!content) {
      setFeedbackMessage("Please enter feedback content.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackMessage("");
    try {
      const result = await FeedbackResultService.submitFeedback({
        type: feedbackType,
        content,
        contact: feedbackContact.trim() || undefined,
      });

      if (!result.success || !result.data) {
        setFeedbackMessage(result.error || result.message || "Feedback submission failed.");
        return;
      }

      setFeedbackContent("");
      setFeedbackContact("");
      setFeedbackMessage(`Feedback submitted successfully (ID: ${result.data.id}).`);
    } catch (error) {
      console.error("Failed to submit feedback.", error);
      setFeedbackMessage("Feedback submission failed.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary p-6">
        <div className="rounded-xl border border-border bg-bg-secondary p-5 text-sm text-text-secondary">
          Loading settings...
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <aside className="w-56 border-r border-border bg-bg-secondary p-4">
        <h1 className="px-2 text-lg font-semibold text-text-primary">Settings</h1>
        <p className="px-2 pt-1 text-xs text-text-secondary">Manage account, IM connectivity, and preferences.</p>
        <nav className="mt-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeTab === tab.id
                  ? "bg-primary-soft text-primary"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "account" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Profile</h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>Nickname: {user?.nickname || "Not set"}</p>
                <p>User ID: {user?.id || "-"}</p>
                <p>Email: {user?.email || "Not bound"}</p>
                <p>Phone: {user?.phone || "Not bound"}</p>
              </div>
            </div>

            {IS_DEV ? (
              <div className="rounded-xl border border-border bg-bg-secondary p-4">
                <h2 className="text-sm font-semibold text-text-primary">Development</h2>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Auto-login test account</span>
                  <Toggle
                    checked={!devAutoLoginDisabled}
                    onChange={handleToggleDevAutoLogin}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "imconfig" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">IM Connection Config</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  WebSocket URL
                  <input
                    value={imDraft.wsUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, wsUrl: event.target.value }))
                    }
                    placeholder="ws://localhost:5200"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  HTTP API URL
                  <input
                    value={imDraft.serverUrl}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, serverUrl: event.target.value }))
                    }
                    placeholder="http://localhost:3000"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Device ID
                  <input
                    value={imDraft.deviceId}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, deviceId: event.target.value }))
                    }
                    placeholder="Optional custom device identifier"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Device Type
                  <select
                    value={imDraft.deviceFlag}
                    onChange={(event) =>
                      setImDraft((prev) => ({
                        ...prev,
                        deviceFlag: event.target.value as DeviceFlag,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="PC">PC</option>
                    <option value="WEB">WEB</option>
                    <option value="DESKTOP">DESKTOP</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  UID
                  <input
                    value={imDraft.uid}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, uid: event.target.value }))
                    }
                    placeholder="User UID for SDK auth"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
                <label className="text-sm text-text-secondary">
                  Token
                  <input
                    value={imDraft.token}
                    onChange={(event) =>
                      setImDraft((prev) => ({ ...prev, token: event.target.value }))
                    }
                    placeholder="IM token"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p>Saved UID: {imDraft.uid || "-"}</p>
                <p>Saved Token: {imDraft.token ? "Configured" : "Not configured"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveIMConfig}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110"
              >
                Save IM Config
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === "general" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Appearance</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Theme
                  <select
                    value={settings.theme}
                    onChange={(event) => {
                      const next = event.target.value as SettingsState["theme"];
                      setSettings((prev) => ({ ...prev, theme: next }));
                      if (isUITheme(next)) {
                        setTheme(next);
                      }
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="system">System</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  Font Size
                  <select
                    value={settings.preferences.fontSize}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          fontSize: event.target.value as SettingsState["preferences"]["fontSize"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Preferences</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Compact mode</span>
                  <Toggle
                    checked={settings.preferences.compactMode}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, compactMode: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Auto-download images</span>
                  <Toggle
                    checked={settings.preferences.autoDownload.images}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoDownload: { ...prev.preferences.autoDownload, images: value },
                        },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Auto-download videos</span>
                  <Toggle
                    checked={settings.preferences.autoDownload.videos}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          autoDownload: { ...prev.preferences.autoDownload, videos: value },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "notifications" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Message Notifications</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Message preview</span>
                  <Toggle
                    checked={settings.notifications.messagePreview}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, messagePreview: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Message sound</span>
                  <Toggle
                    checked={settings.notifications.messageSound}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, messageSound: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Do not disturb</span>
                  <Toggle
                    checked={settings.notifications.doNotDisturb}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, doNotDisturb: value },
                      }))
                    }
                  />
                </div>
              </div>
              {settings.notifications.doNotDisturb ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-sm text-text-secondary">
                    Start
                    <input
                      type="time"
                      value={settings.notifications.doNotDisturbStart}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            doNotDisturbStart: event.target.value,
                          },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                  <label className="text-sm text-text-secondary">
                    End
                    <input
                      type="time"
                      value={settings.notifications.doNotDisturbEnd}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            doNotDisturbEnd: event.target.value,
                          },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "privacy" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Visibility</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Online Status
                  <select
                    value={settings.privacy.onlineStatus}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          onlineStatus: event.target.value as SettingsState["privacy"]["onlineStatus"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </label>
                <label className="text-sm text-text-secondary">
                  Phone Visibility
                  <select
                    value={settings.privacy.phoneNumber}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          phoneNumber: event.target.value as SettingsState["privacy"]["phoneNumber"],
                        },
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">Contacts only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Allow search by phone</span>
                  <Toggle
                    checked={settings.privacy.addByPhone}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, addByPhone: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Allow search by username</span>
                  <Toggle
                    checked={settings.privacy.addByUsername}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, addByUsername: value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Read receipts</span>
                  <Toggle
                    checked={settings.privacy.readReceipts}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, readReceipts: value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "about" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Application Info</h2>
              <div className="mt-3 space-y-2 text-sm text-text-secondary">
                <p>Version: {appInfo.version}</p>
                <p>Build: {appInfo.buildNumber}</p>
                <p>Platform: {appInfo.platform}</p>
                <p>Status: {appInfo.updateAvailable ? "Update available" : "Up to date"}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    void handleCheckUpdate();
                  }}
                  disabled={isCheckingUpdate}
                  className="rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-hover disabled:opacity-60"
                >
                  {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary p-4">
              <h2 className="text-sm font-semibold text-text-primary">Feedback</h2>
              <p className="mt-1 text-xs text-text-secondary">
                Submit product issues or suggestions. We will follow up through your contact info.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Feedback Type
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="bug">Bug</option>
                    <option value="experience">Experience</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="text-sm text-text-secondary">
                  Contact (optional)
                  <input
                    value={feedbackContact}
                    onChange={(event) => setFeedbackContact(event.target.value)}
                    placeholder="Email / phone / IM"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm text-text-secondary">
                Content
                <textarea
                  value={feedbackContent}
                  onChange={(event) => setFeedbackContent(event.target.value)}
                  placeholder="Describe your issue or suggestion..."
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmitFeedback();
                  }}
                  disabled={feedbackSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
                {feedbackMessage ? (
                  <p className="text-sm text-text-secondary">{feedbackMessage}</p>
                ) : null}
              </div>

              <div className="mt-4 rounded-lg border border-border bg-bg-primary p-3 text-xs text-text-muted">
                <p>Support Email: {feedbackSupport.email || "-"}</p>
                <p>Hotline: {feedbackSupport.hotline || "-"}</p>
                <p>Working Hours: {feedbackSupport.workingHours || "-"}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          {showSettingsSave ? (
            <button
              type="button"
              onClick={() => {
                void handleSaveSettings();
              }}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          ) : null}
          {saveMessage ? <p className="text-sm text-text-secondary">{saveMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
