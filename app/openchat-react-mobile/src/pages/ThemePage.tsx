import React from 'react';
import { navigate } from '../router';
import { useTheme, ThemeType } from '../services/themeContext';
import { Navbar } from '../components/Navbar/Navbar';

const ThemeOption = ({ 
    themeKey, 
    label, 
    previewColor, 
    previewBg,
    isSelected, 
    onSelect 
}: { 
    themeKey: ThemeType, 
    label: string, 
    previewColor: string, 
    previewBg: string,
    isSelected: boolean, 
    onSelect: () => void 
}) => (
    <div 
        onClick={onSelect}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            background: 'var(--bg-card)',
            borderBottom: '0.5px solid var(--border-color)',
            cursor: 'pointer'
        }}
    >
        <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: previewBg,
            border: '1px solid var(--border-color)',
            marginRight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: previewColor }} />
        </div>
        <div style={{ flex: 1, fontSize: '16px', color: 'var(--text-primary)' }}>{label}</div>
        {isSelected && (
            <div style={{ color: 'var(--primary-color)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            </div>
        )}
    </div>
);

export const ThemePage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
      {/* Explicit parent: Settings */}
      <Navbar title="外观设置" onBack={() => navigate('/settings')} />
      
      <div style={{ padding: '16px 16px 8px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        选择主题模式
      </div>
      
      <div>
        <ThemeOption 
            themeKey="light"
            label="标准模式 (Standard)"
            previewBg="#ededed"
            previewColor="#2979FF"
            isSelected={theme === 'light'}
            onSelect={() => setTheme('light')}
        />
        <ThemeOption 
            themeKey="wechat-dark"
            label="经典深色 (Classic Dark)"
            previewBg="#111111"
            previewColor="#2979FF"
            isSelected={theme === 'wechat-dark'}
            onSelect={() => setTheme('wechat-dark')}
        />
        <ThemeOption 
            themeKey="dark"
            label="纯粹黑 (OLED Black)"
            previewBg="#000000"
            previewColor="#2979FF"
            isSelected={theme === 'dark'}
            onSelect={() => setTheme('dark')}
        />
        <ThemeOption 
            themeKey="midnight-blue"
            label="极客蓝 (Geek Blue)"
            previewBg="#0d1117"
            previewColor="#1f6feb"
            isSelected={theme === 'midnight-blue'}
            onSelect={() => setTheme('midnight-blue')}
        />
      </div>

      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
         AI 主题色 (Tech Blue) 已启用
      </div>
    </div>
  );
};