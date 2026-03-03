import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeType = "light" | "dark" | "blue" | "purple" | "system";
type ResolvedThemeType = Exclude<ThemeType, "system">;

interface ThemeTokens {
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primarySoft: string;
  primaryMedium: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  borderColor: string;
  borderLight: string;
  borderMedium: string;
}

interface ThemeContextValue {
  currentTheme: ThemeType;
  resolvedTheme: ResolvedThemeType;
  isDark: boolean;
  themeConfig: ThemeTokens;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "openchat-theme";

const themeTokens: Record<ResolvedThemeType, ThemeTokens> = {
  dark: {
    name: "Dark",
    primary: "#3B82F6",
    primaryHover: "#2563EB",
    primaryLight: "#60A5FA",
    primaryDark: "#1D4ED8",
    primarySoft: "rgba(59, 130, 246, 0.15)",
    primaryMedium: "rgba(59, 130, 246, 0.25)",
    bgPrimary: "#000000",
    bgSecondary: "#0A0A0A",
    bgTertiary: "#141414",
    bgElevated: "#1C1C1C",
    textPrimary: "#FFFFFF",
    textSecondary: "#E5E7EB",
    textTertiary: "#9CA3AF",
    textMuted: "#6B7280",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderLight: "rgba(255, 255, 255, 0.06)",
    borderMedium: "rgba(255, 255, 255, 0.18)",
  },
  light: {
    name: "Light",
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryLight: "#3B82F6",
    primaryDark: "#1E40AF",
    primarySoft: "rgba(37, 99, 235, 0.10)",
    primaryMedium: "rgba(37, 99, 235, 0.20)",
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F8FAFC",
    bgTertiary: "#F1F5F9",
    bgElevated: "#E2E8F0",
    textPrimary: "#0F172A",
    textSecondary: "#334155",
    textTertiary: "#64748B",
    textMuted: "#94A3B8",
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderLight: "rgba(0, 0, 0, 0.06)",
    borderMedium: "rgba(0, 0, 0, 0.18)",
  },
  blue: {
    name: "Blue",
    primary: "#06B6D4",
    primaryHover: "#0891B2",
    primaryLight: "#22D3EE",
    primaryDark: "#0E7490",
    primarySoft: "rgba(6, 182, 212, 0.15)",
    primaryMedium: "rgba(6, 182, 212, 0.25)",
    bgPrimary: "#0C1E2A",
    bgSecondary: "#122B3D",
    bgTertiary: "#1A3A52",
    bgElevated: "#234868",
    textPrimary: "#FFFFFF",
    textSecondary: "#E0F2FE",
    textTertiary: "#7DD3FC",
    textMuted: "#38BDF8",
    borderColor: "rgba(125, 211, 252, 0.16)",
    borderLight: "rgba(125, 211, 252, 0.08)",
    borderMedium: "rgba(125, 211, 252, 0.24)",
  },
  purple: {
    name: "Purple",
    primary: "#8B5CF6",
    primaryHover: "#7C3AED",
    primaryLight: "#A78BFA",
    primaryDark: "#6D28D9",
    primarySoft: "rgba(139, 92, 246, 0.15)",
    primaryMedium: "rgba(139, 92, 246, 0.25)",
    bgPrimary: "#1A1425",
    bgSecondary: "#251B35",
    bgTertiary: "#35254A",
    bgElevated: "#452F5F",
    textPrimary: "#FFFFFF",
    textSecondary: "#F3E8FF",
    textTertiary: "#D8B4FE",
    textMuted: "#A855F7",
    borderColor: "rgba(216, 180, 254, 0.16)",
    borderLight: "rgba(216, 180, 254, 0.08)",
    borderMedium: "rgba(216, 180, 254, 0.24)",
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemeType): ResolvedThemeType {
  if (theme !== "system") return theme;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyThemeToDocument(theme: ThemeType): ResolvedThemeType {
  if (typeof document === "undefined") return resolveTheme(theme);

  const resolved = resolveTheme(theme);
  const tokens = themeTokens[resolved];
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.style.setProperty("--ai-primary", tokens.primary);
  root.style.setProperty("--ai-primary-hover", tokens.primaryHover);
  root.style.setProperty("--ai-primary-light", tokens.primaryLight);
  root.style.setProperty("--ai-primary-dark", tokens.primaryDark);
  root.style.setProperty("--ai-primary-soft", tokens.primarySoft);
  root.style.setProperty("--ai-primary-medium", tokens.primaryMedium);

  root.style.setProperty("--bg-primary", tokens.bgPrimary);
  root.style.setProperty("--bg-secondary", tokens.bgSecondary);
  root.style.setProperty("--bg-tertiary", tokens.bgTertiary);
  root.style.setProperty("--bg-elevated", tokens.bgElevated);

  root.style.setProperty("--text-primary", tokens.textPrimary);
  root.style.setProperty("--text-secondary", tokens.textSecondary);
  root.style.setProperty("--text-tertiary", tokens.textTertiary);
  root.style.setProperty("--text-muted", tokens.textMuted);

  root.style.setProperty("--border-color", tokens.borderColor);
  root.style.setProperty("--border-light", tokens.borderLight);
  root.style.setProperty("--border-medium", tokens.borderMedium);

  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    if (typeof localStorage === "undefined") return "dark";
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeType | null;
    return saved || "dark";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeType>(() =>
    resolveTheme(currentTheme),
  );

  useEffect(() => {
    const next = applyThemeToDocument(currentTheme);
    setResolvedTheme(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, currentTheme);
    }
  }, [currentTheme]);

  useEffect(() => {
    if (currentTheme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      setResolvedTheme(applyThemeToDocument("system"));
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [currentTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      currentTheme,
      resolvedTheme,
      isDark: resolvedTheme !== "light",
      themeConfig: themeTokens[resolvedTheme],
      setTheme: setCurrentTheme,
      toggleTheme: () =>
        setCurrentTheme((prev) => {
          const order: ThemeType[] = ["dark", "light", "blue", "purple", "system"];
          const index = order.indexOf(prev);
          return order[(index + 1) % order.length];
        }),
    }),
    [currentTheme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;

  const resolved = resolveTheme("dark");
  return {
    currentTheme: "dark",
    resolvedTheme: resolved,
    isDark: true,
    themeConfig: themeTokens[resolved],
    setTheme: (theme) => {
      applyThemeToDocument(theme);
    },
    toggleTheme: () => {
      applyThemeToDocument("light");
    },
  };
}
