/**
 * 主题选择器组件
 *
 * 职责：提供主题切换 UI
 */

import React from 'react';
import { useTheme, themes, type ThemeType } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';

export interface ThemeSelectorProps {
  /** 自定义类名 */
  className?: string;
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical';
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
}

/**
 * 主题选择器组件
 */
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className,
  direction = 'horizontal',
  size = 'medium',
}) => {
  const { currentTheme, setTheme } = useTheme();

  const sizeClasses = {
    small: {
      container: 'gap-2',
      item: 'w-8 h-8',
      label: 'text-xs',
    },
    medium: {
      container: 'gap-3',
      item: 'w-12 h-12',
      label: 'text-sm',
    },
    large: {
      container: 'gap-4',
      item: 'w-16 h-16',
      label: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
        currentSize.container,
        className
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
              'group relative flex flex-col items-center gap-2 rounded-xl transition-all duration-200',
              direction === 'vertical' && 'flex-row w-full p-3 hover:bg-[var(--bg-hover)]',
              isActive && direction === 'vertical' && 'bg-[var(--bg-hover)]'
            )}
            title={theme.name}
          >
            {/* 主题预览色块 */}
            <div
              className={cn(
                'relative rounded-xl overflow-hidden transition-all duration-200',
                currentSize.item,
                'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)]',
                isActive
                  ? 'ring-[var(--ai-primary)] scale-110 shadow-[var(--shadow-glow)]'
                  : 'ring-transparent hover:ring-[var(--border-medium)]'
              )}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.bgPrimary} 50%, ${theme.colors.primary} 50%)`,
              }}
            >
              {/* 选中标记 */}
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

            {/* 主题名称 */}
            <span
              className={cn(
                currentSize.label,
                'font-medium transition-colors',
                isActive
                  ? 'text-[var(--ai-primary)]'
                  : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
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
 * 简洁主题切换按钮
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { currentTheme, toggleTheme, themeConfig } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-[var(--bg-secondary)] border border-[var(--border-color)]',
        'hover:bg-[var(--bg-hover)] transition-colors',
        className
      )}
      title={`当前主题: ${themeConfig.name}`}
    >
      {/* 主题图标 */}
      <div
        className="w-5 h-5 rounded-md"
        style={{
          background: `linear-gradient(135deg, ${themeConfig.colors.bgPrimary} 50%, ${themeConfig.colors.primary} 50%)`,
        }}
      />
      <span className="text-sm text-[var(--text-secondary)]">{themeConfig.name}</span>
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
          d="M8 9l4-4 4 4m0 6l-4 4-4-4"
        />
      </svg>
    </button>
  );
};

export default ThemeSelector;
