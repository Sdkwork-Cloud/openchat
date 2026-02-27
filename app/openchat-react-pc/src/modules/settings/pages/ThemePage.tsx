import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Palette, Check, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { ThemeType, ThemeOption } from '../types';
import { SettingsService } from '../services/SettingsService';

const themeOptions: ThemeOption[] = [
  {
    key: 'light',
    name: '明亮主题',
    description: '清爽的浅色界面，适合白天使用',
    preview: { bg: '#ffffff', primary: '#3b82f6', text: '#1f2937' },
  },
  {
    key: 'dark',
    name: '深色主题',
    description: '护眼的深色界面，适合夜间使用',
    preview: { bg: '#1f2937', primary: '#60a5fa', text: '#f9fafb' },
  },
  {
    key: 'blue',
    name: '微信黑',
    description: '经典的深色模式，类似微信风格',
    preview: { bg: '#111111', primary: '#07c160', text: '#ffffff' },
  },
  {
    key: 'purple',
    name: '午夜蓝',
    description: '优雅的深蓝色调，沉稳大气',
    preview: { bg: '#0f172a', primary: '#818cf8', text: '#e2e8f0' },
  },
  {
    key: 'system',
    name: '跟随系统',
    description: '自动跟随操作系统的主题设置',
    preview: { bg: 'linear-gradient(135deg, #ffffff 50%, #1f2937 50%)', primary: '#3b82f6', text: '#1f2937' },
  },
];

// 主题预览卡片
const ThemePreviewCard: React.FC<{
  theme: ThemeOption;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ theme, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl border-2 transition-all overflow-hidden",
        isSelected 
          ? "border-blue-500 shadow-lg" 
          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
      )}
    >
      {/* 预览区域 */}
      <div 
        className="h-32 p-4 relative"
        style={{ background: theme.preview.bg }}
      >
        {/* 模拟界面元素 */}
        <div className="space-y-2">
          <div 
            className="h-4 w-3/4 rounded"
            style={{ backgroundColor: theme.preview.text + '20' }}
          />
          <div 
            className="h-3 w-1/2 rounded"
            style={{ backgroundColor: theme.preview.text + '15' }}
          />
          <div className="flex gap-2 mt-4">
            <div 
              className="h-8 w-20 rounded-lg"
              style={{ backgroundColor: theme.preview.primary }}
            />
            <div 
              className="h-8 w-20 rounded-lg border"
              style={{ borderColor: theme.preview.text + '30' }}
            />
          </div>
        </div>

        {/* 选中标记 */}
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{theme.name}</h3>
          {theme.key === 'system' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              推荐
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{theme.description}</p>
      </div>
    </button>
  );
};

// 字体大小设置
const FontSizeSetting: React.FC = () => {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const sizes = [
    { key: 'small', label: '小', className: 'text-sm' },
    { key: 'medium', label: '中', className: 'text-base' },
    { key: 'large', label: '大', className: 'text-lg' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">字体大小</h3>
      <div className="flex items-center gap-4">
        {sizes.map((size) => (
          <button
            key={size.key}
            onClick={() => setFontSize(size.key as any)}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg border-2 transition-all",
              fontSize === size.key
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <span className={cn("font-medium", size.className)}>
              {size.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-3">
        调整应用中的文字显示大小
      </p>
    </div>
  );
};

// 紧凑模式设置
const CompactModeSetting: React.FC = () => {
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">紧凑模式</h3>
          <p className="text-sm text-gray-500 mt-1">
            减小间距和元素大小，在屏幕上显示更多内容
          </p>
        </div>
        <button
          onClick={() => setCompactMode(!compactMode)}
          className={cn(
            "w-14 h-7 rounded-full transition-colors relative",
            compactMode ? "bg-blue-500" : "bg-gray-300"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
              compactMode ? "left-8" : "left-1"
            )}
          />
        </button>
      </div>
    </div>
  );
};

// 动画效果设置
const AnimationSetting: React.FC = () => {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">动画效果</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">启用动画</p>
          <p className="text-sm text-gray-500">
            显示界面过渡和交互动画
          </p>
        </div>
        <button
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
          className={cn(
            "w-14 h-7 rounded-full transition-colors relative",
            animationsEnabled ? "bg-blue-500" : "bg-gray-300"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
              animationsEnabled ? "left-8" : "left-1"
            )}
          />
        </button>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="font-medium text-gray-900">减少动态效果</p>
          <p className="text-sm text-gray-500">
            降低动画强度，适合对动态敏感的用户
          </p>
        </div>
        <button
          onClick={() => setReducedMotion(!reducedMotion)}
          className={cn(
            "w-14 h-7 rounded-full transition-colors relative",
            reducedMotion ? "bg-blue-500" : "bg-gray-300"
          )}
        >
          <div
            className={cn(
              "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
              reducedMotion ? "left-8" : "left-1"
            )}
          />
        </button>
      </div>
    </div>
  );
};

// 主页面
export const ThemePage: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeSelect = async (themeKey: ThemeType) => {
    setSelectedTheme(themeKey);
    setIsSaving(true);
    try {
      await SettingsService.setTheme(themeKey);
      setTheme(themeKey);
      showToast('主题已更新', 'success');
    } catch (error) {
      showToast('主题更新失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Palette className="w-7 h-7 text-blue-500" />
          外观主题
        </h1>
        <p className="text-gray-500 mt-2">
          自定义 OpenChat 的外观和显示方式
        </p>
      </div>

      {/* 主题选择 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">选择主题</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {themeOptions.map((themeOption) => (
            <ThemePreviewCard
              key={themeOption.key}
              theme={themeOption}
              isSelected={selectedTheme === themeOption.key}
              onSelect={() => handleThemeSelect(themeOption.key)}
            />
          ))}
        </div>
      </div>

      {/* 其他显示设置 */}
      <div className="space-y-4 max-w-2xl">
        <FontSizeSetting />
        <CompactModeSetting />
        <AnimationSetting />
      </div>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-900">提示</h4>
          <p className="text-sm text-blue-700 mt-1">
            主题设置会自动保存并应用到所有设备。部分主题可能需要重新启动应用才能完全生效。
          </p>
        </div>
      </div>
    </div>
  );
};
