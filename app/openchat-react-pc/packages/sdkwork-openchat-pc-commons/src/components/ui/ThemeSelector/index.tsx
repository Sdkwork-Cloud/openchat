/**
 * 涓婚閫夋嫨鍣ㄧ粍浠? *
 * 鑱岃矗锛氭彁渚涗富棰樺垏鎹?UI
 */

import React from "react";
import {
  useTheme,
  themes,
  type ThemeType,
} from "../../../contexts/ThemeContext";
import { cn } from "../../../utils/cn";

export interface ThemeSelectorProps {
  /** 鑷畾涔夌被鍚?*/
  className?: string;
  /** 甯冨眬鏂瑰悜 */
  direction?: "horizontal" | "vertical";
  /** 灏哄 */
  size?: "small" | "medium" | "large";
}

/**
 * 涓婚閫夋嫨鍣ㄧ粍浠? */
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className,
  direction = "horizontal",
  size = "medium",
}) => {
  const { currentTheme, setTheme } = useTheme();

  const sizeClasses = {
    small: {
      container: "gap-2",
      item: "w-8 h-8",
      label: "text-xs",
    },
    medium: {
      container: "gap-3",
      item: "w-12 h-12",
      label: "text-sm",
    },
    large: {
      container: "gap-4",
      item: "w-16 h-16",
      label: "text-base",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        currentSize.container,
        className,
      )}
    >
      {(Object.keys(themes) as ThemeType[]).map((themeKey) => {
        const theme = themes[themeKey];
        const isActive = currentTheme === themeKey;

        return (
          <button
            key={themeKey}
            onClick={() => setTheme(themeKey)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl transition-all duration-200",
              direction === "vertical" &&
                "flex-row w-full p-3 hover:bg-bg-hover",
              isActive && direction === "vertical" && "bg-bg-hover",
            )}
            title={theme.name}
          >
            {/* 涓婚棰勮鑹插潡 */}
            <div
              className={cn(
                "relative rounded-xl overflow-hidden transition-all duration-200",
                currentSize.item,
                "ring-2 ring-offset-2 ring-offset-bg-primary",
                isActive
                  ? "ring-primary scale-110 shadow-glow-primary"
                  : "ring-transparent hover:ring-border-medium",
              )}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.bgPrimary} 50%, ${theme.colors.primary} 50%)`,
              }}
            >
              {/* 閫変腑鏍囪 */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <svg
                    className="w-5 h-5 text-white drop-shadow-md"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* 涓婚鍚嶇О */}
            <span
              className={cn(
                currentSize.label,
                "font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-text-secondary group-hover:text-text-primary",
              )}
            >
              {theme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * 绠€娲佷富棰樺垏鎹㈡寜閽? */
export const ThemeToggle: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { currentTheme, toggleTheme, themeConfig } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-bg-secondary border border-border",
        "hover:bg-bg-hover transition-colors",
        className,
      )}
      title={`褰撳墠涓婚: ${themeConfig.name}`}
    >
      {/* 涓婚鍥炬爣 */}
      <div
        className="w-5 h-5 rounded-md"
        style={{
          background: `linear-gradient(135deg, ${themeConfig.colors.bgPrimary} 50%, ${themeConfig.colors.primary} 50%)`,
        }}
      />
      <span className="text-sm text-text-secondary">{themeConfig.name}</span>
      <svg
        className="w-4 h-4 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l4-4 4 4m0 6l-4 4-4-4"
        />
      </svg>
    </button>
  );
};

export default ThemeSelector;

