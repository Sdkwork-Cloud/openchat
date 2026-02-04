/**
 * 应用主入口
 * 
 * 职责：初始化应用，加载全局配置
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';

// 导入国际化配置（必须在 App 渲染前加载）
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);