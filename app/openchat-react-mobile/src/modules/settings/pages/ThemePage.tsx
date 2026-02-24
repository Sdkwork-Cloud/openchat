
import React from 'react';
import { navigate, navigateBack } from '../../../router';
import { useTheme, ThemeType } from '../../../services/themeContext';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Cell, CellGroup } from '../../../components/Cell';

const ThemePreviewIcon = ({ color, bg }: { color: string, bg: string }) => (
    <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: bg,
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
    </div>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary-color)">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
);

export const ThemePage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleSelect = (key: ThemeType) => {
      setTheme(key);
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
      <Navbar title="外观设置" onBack={() => navigateBack('/settings')} />
      
      <CellGroup title="选择主题模式">
        <Cell 
            title="标准模式 (Standard)" 
            icon={<ThemePreviewIcon bg="#ededed" color="#2979FF" />}
            value={theme === 'light' ? <CheckIcon /> : null}
            onClick={() => handleSelect('light')}
        />
        <Cell 
            title="经典深色 (Classic Dark)" 
            icon={<ThemePreviewIcon bg="#111111" color="#2979FF" />}
            value={theme === 'wechat-dark' ? <CheckIcon /> : null}
            onClick={() => handleSelect('wechat-dark')}
        />
        <Cell 
            title="纯粹黑 (OLED Black)" 
            icon={<ThemePreviewIcon bg="#000000" color="#2979FF" />}
            value={theme === 'dark' ? <CheckIcon /> : null}
            onClick={() => handleSelect('dark')}
        />
        <Cell 
            title="极客蓝 (Geek Blue)" 
            icon={<ThemePreviewIcon bg="#0d1117" color="#1f6feb" />}
            value={theme === 'midnight-blue' ? <CheckIcon /> : null}
            onClick={() => handleSelect('midnight-blue')}
        />
      </CellGroup>

      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
         AI 主题色 (Tech Blue) 已启用
      </div>
    </div>
  );
};
