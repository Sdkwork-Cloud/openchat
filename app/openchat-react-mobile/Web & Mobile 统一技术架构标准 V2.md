# Web & Mobile 统一技术架构标准 V2（React + Capacitor + WeChat）

> **V2 版本说明**：
> 在 V1 架构不变的前提下，系统性补齐 **微信公众号 / 微信 WebView 场景**，并完善 App 开发的工程、规范与治理标准。
>
> **V2.1 移动端增强说明**：
> - 新增移动端专属目录结构（`src/mobile/`）
> - 新增移动端组件开发规范（含完整组件列表）
> - 新增移动端性能与体验标准
> - 新增移动端安全规范
> - 新增 Capacitor 配置与构建规范
>
> 本文档是 **完整可独立使用的母架构标准**，用于企业级长期演进。

---

## 0. 架构定位（系统宪法）

> **React 负责一切 UI 与业务，Platform 负责一切环境差异，Capacitor / WeChat 只是运行时实现。**

关键词：

* 单一业务源
* 多运行时适配
* 严禁环境入侵业务层

---

## 1. 支持的运行环境（V2 完整矩阵）

| 环境          | 运行时                   | 说明           |
| ----------- | --------------------- | ------------ |
| 标准 Web      | Browser               | 官网 / H5      |
| 微信公众号       | WeChat WebView        | 公众号内网页       |
| iOS App     | Capacitor + WKWebView | 原生壳          |
| Android App | Capacitor + WebView   | 原生壳          |
| AI App      | Capacitor             | AI Native 场景 |

---

## 2. 核心技术栈（强约束）

| 层级            | 技术                 | 说明            |
| ------------- | ------------------ | ------------- |
| UI            | React + TypeScript | 所有页面          |
| State         | Zustand / Redux    | 状态管理          |
| Build         | Vite               | 构建            |
| Mobile Shell  | Capacitor          | iOS / Android |
| WeChat Bridge | WeChat JS-SDK      | 微信能力          |
| Platform      | 自定义抽象层             | 唯一系统入口        |

---

## 3. Platform 架构标准（核心）
确保所有代码在/src/目录下
Platform 是 **业务与环境之间唯一合法边界**。

```text
/src/platform
├── index.ts            # 抽象接口（唯一出口）
├── env.ts              # 环境探测（不可业务使用）
├── capabilities.ts     # 能力声明

/src/platform-impl
├── web/                # 标准浏览器
├── wechat/             # 微信公众号
├── capacitor/          # App
```

### Platform 能力分类

* Navigation
* Auth
* Share
* Payment
* Device
* Storage
* Lifecycle

---

## 4. 微信公众号专项标准（V2 新增）

### 4.1 微信能力必须 Platform 化

❌ 禁止：

```ts
wx.share()
```

✅ 正确：

```ts
Platform.share()
```

### 4.2 WeChat Platform Impl 职责

* JS-SDK 初始化
* 权限校验
* 能力适配
* 错误兜底

```text
/src/platform-impl/wechat
├── share.ts
├── auth.ts
├── pay.ts
├── lifecycle.ts
└── index.ts
```

---

## 5. 微信公众号开发规范（工程级）

### 5.1 URL 与路由

* 禁止 hash 路由
* 使用 history 模式
* 支持 OAuth 回跳

### 5.2 授权流程

* 授权逻辑只能存在于 Platform
* 业务只接收 `user` 结果

### 5.3 分享规范

* 页面不感知分享来源
* 分享参数由 Platform 注入

---

## 6. App（iOS / Android）开发标准复查

### 6.1 必须满足

* 所有系统能力 Platform 化
* 禁止 UI 层调用 Capacitor Plugin
* Plugin 不包含业务判断

### 6.2 生命周期

```text
App Resume / Pause / Background
↓
Platform Lifecycle
↓
业务订阅
```

### 6.3 移动端项目目录结构（新增）

确保所有移动端相关代码和资源遵循以下目录结构：

```text
src/
├── mobile/                     # 移动端专属目录
│   ├── native/                 # 原生桥接相关（Capacitor）
│   │   ├── plugins/            # 自定义 Capacitor 插件
│   │   │   ├── CustomCamera/
│   │   │   ├── BiometricAuth/
│   │   │   └── BluetoothLE/
│   │   ├── bridges/            # 原生桥接代码
│   │   │   ├── ios/            # iOS 桥接
│   │   │   └── android/        # Android 桥接
│   │   └── configs/            # 原生配置文件
│   │       ├── ios-info.plist
│   │       └── android-manifest.xml
│   │
│   ├── assets/                 # 移动端专属资源
│   │   ├── icons/              # 应用图标（多尺寸）
│   │   ├── splash/             # 启动屏图片
│   │   ├── fonts/              # 移动端字体文件
│   │   └── sounds/             # 提示音/铃声
│   │
│   ├── hooks/                  # 移动端专用 Hooks
│   │   ├── useKeyboard.ts      # 键盘管理
│   │   ├── useSafeArea.ts      # 安全区域适配
│   │   ├── useOrientation.ts   # 屏幕方向监听
│   │   ├── usePullToRefresh.ts # 下拉刷新
│   │   ├── useHaptic.ts        # 触觉反馈
│   │   └── useStatusBar.ts     # 状态栏控制
│   │
│   └── styles/                 # 移动端样式系统
│       ├── mobile-theme.css    # 移动端主题变量
│       ├── safe-area.css       # 安全区域适配样式
│       └── touch-feedback.css  # 触摸反馈样式
│
├── platform-impl/capacitor/    # Capacitor Platform 实现
│   ├── index.ts
│   ├── device.ts               # 设备能力
│   ├── storage.ts              # 存储实现
│   ├── camera.ts               # 相机能力
│   ├── geolocation.ts          # 定位能力
│   ├── notifications.ts        # 推送通知
│   ├── barcode.ts              # 扫码能力
│   └── biometric.ts            # 生物识别
│
ios/                            # iOS 原生工程（生成）
├── App/
├── App.xcodeproj
└── Podfile

android/                        # Android 原生工程（生成）
├── app/
├── gradle/
└── build.gradle
```

#### 6.3.1 原生插件开发规范

```text
/src/mobile/native/plugins/{PluginName}/
├── src/
│   ├── index.ts                # 插件 TypeScript 定义
│   ├── web.ts                  # Web 降级实现
│   └── definitions.ts          # 接口定义
├── ios/
│   ├── Plugin.swift            # iOS 原生实现
│   └── Plugin.m                # Objective-C 桥接
├── android/
│   ├── Plugin.kt               # Android 原生实现
│   └── Plugin.java             # Java 桥接
├── package.json
└── README.md
```

#### 6.3.2 移动端资源规范

| 资源类型 | 规格要求 | 存放位置 |
|---------|---------|---------|
| 应用图标 | 1024x1024 源图，自动生成多尺寸 | `/mobile/assets/icons/` |
| 启动屏 | 2732x2732 PNG，适配各种屏幕 | `/mobile/assets/splash/` |
| 字体 | woff2/ttf 格式，按需加载 | `/mobile/assets/fonts/` |
| 提示音 | mp3/aac，< 100KB | `/mobile/assets/sounds/` |

---

## 7. 通用工程规范（V2 补强）

### 7.1 模块化
确保所有模块都在 `/src/modules` 下
```text
/src/modules/{domain}
├── pages
├── services
├── store
└── index.ts
```

* Module 之间禁止互相 import
* 只通过公共 Service 通信

### 7.2 环境禁止项[Web & Mobile 统一技术架构标准 V2.md](Web%20%26%20Mobile%20%E7%BB%9F%E4%B8%80%E6%8A%80%E6%9C%AF%E6%9E%B6%E6%9E%84%E6%A0%87%E5%87%86%20V2.md)

* 禁止 `if (isWeChat)` 出现在业务
* 禁止 `navigator.userAgent`
* 禁止 `window.wx`

---

### 7.3 前端Layouts结构标准

确保所有布局组件都在 `/src/layouts` 目录下

```text
/src/layouts/
├── MainLayout/          # 主要应用布局（带主导航）
├── AuthLayout/          # 认证相关布局（登录/注册等）
├── BlankLayout/         # 空白布局（无边框/导航）
├── PageLayout/          # 通用页面布局
└── MobileLayout/        # 移动端专用布局
```

* Layout只负责页面结构，不包含业务逻辑
* Layout间禁止相互依赖
* 支持响应式断点适配

---

### 7.4 前端项目结构标准（完整）

确保所有代码遵循以下完整目录结构：

```text
src/
├── app/                        # 应用生命周期（全局唯一）
│   ├── App.tsx                 # 根组件
│   ├── AppProvider.tsx         # 全局Provider容器
│   ├── bootstrap.ts            # 应用启动逻辑
│   └── env.ts                  # 环境变量配置
│
├── layouts/                    # 页面骨架（只负责结构）
│   ├── MainLayout/             # 主要应用布局（带主导航）
│   ├── AuthLayout/             # 认证相关布局（登录/注册等）
│   ├── BlankLayout/            # 空白布局（无边框/导航）
│   ├── PageLayout/             # 通用页面布局
│   └── MobileLayout/           # 移动端专用布局
│
├── router/                     # 路由系统（唯一入口）
│   ├── routes.ts               # 路由配置
│   ├── guards.ts               # 路由守卫
│   ├── constants.ts            # 路由常量
│   └── index.ts                # 路由导出
│
├── pages/                      # 固定应用级页面
│   ├── HomePage.tsx            # 首页
│   ├── LoginPage.tsx           # 登录页
│   ├── SettingsPage.tsx        # 设置页
│   └── NotFoundPage.tsx        # 404页面
│
├── modules/                    # 业务域模块（可插拔）
│   ├── im/                     # 即时通讯模块（基础模块）
│   ├── rtc/                    # 实时通信模块（基础模块）
│   ├── auth/                   # 认证模块
│   ├── user/                   # 用户模块
│   ├── settings/               # 设置模块
│   ├── payment/                # 支付模块
│   ├── order/                  # 订单中心模块
│   ├── product/                # 商品模块
│   ├── feeds/                  # Feeds流模块
│   ├── notification/           # 通知模块
│   ├── chat/                   # 聊天模块
│   ├── media/                  # 媒体资源模块
│   ├── search/                 # 搜索模块
│   ├── profile/                # 个人资料模块
│   ├── social/                 # 社交模块
│   └── analytics/              # 数据分析模块
│
│   # 每个业务模块包含以下子目录：
│   ├── pages/                  # 模块页面
│   ├── components/             # 模块内组件
│   ├── services/               # 模块服务
│   ├── hooks/                  # 模块钩子
│   ├── types/                  # 模块类型定义
│   ├── utils/                  # 模块工具函数
│   └── index.ts                # 模块导出
│
├── components/                 # 通用 UI 组件库（纯 UI）
│   ├── Button/                 # 按钮类组件
│   ├── Form/                   # 表单类组件
│   ├── Feedback/               # 反馈类组件
│   ├── List/                   # 列表类组件
│   ├── Navigation/             # 导航类组件
│   ├── Navbar/                 # 导航栏组件（移动端）
│   ├── Tabbar/                 # 底部标签栏组件（移动端）
│   ├── Tabs/                   # 标签页组件（移动端）
│   ├── Data/                   # 数据展示类组件
│   ├── Cell/                   # 单元格组件（移动端通用）
│   └── CellGroup/              # 单元格组合组件（移动端通用）
│
├── services/                   # 应用级 Service（极少）
│   ├── api/                    # API服务
│   ├── storage/                # 存储服务
│   └── auth/                   # 认证服务
│
├── platform/                   # Platform 抽象
│   ├── index.ts                # 抽象接口（唯一出口）
│   ├── env.ts                  # 环境探测
│   └── capabilities.ts         # 能力声明
│
├── platform-impl/              # Platform 实现（web / desktop）
│   ├── web/                    # 标准浏览器实现
│   ├── wechat/                 # 微信公众号实现
│   └── capacitor/              # App实现
│
├── store/                      # 全局状态
│   ├── index.ts                # 状态中心入口
│   ├── userStore.ts            # 用户状态
│   └── uiStore.ts              # UI状态
│
├── entities/                   # 跨模块领域模型
│   ├── User.ts                 # 用户实体
│   └── BaseModel.ts            # 基础实体模型
│
├── i18n/                       # 国际化
│   ├── locales/                # 语言包
│   └── index.ts                # 国际化配置
│
├── types/                      # 全局类型
│   ├── api.d.ts                # API类型定义
│   ├── global.d.ts             # 全局类型
│   └── utils.d.ts              # 工具类型
│
└── utils/                      # 纯工具函数
    ├── helpers.ts              # 辅助函数
    ├── validators.ts           # 验证函数
    └── formatters.ts           # 格式化函数
```

* 所有目录名称严格遵循约定，不可随意更改
* 模块内结构保持一致性
* 组件按功能分类存放
* 类型定义与实现分离

---

### 7.5 通用UI组件库规范（节选）

确保所有组件都在 `/src/components` 目录下

```text
/src/components/
├── Button/        # 按钮类组件
├── Form/          # 表单类组件
├── Feedback/      # 反馈类组件
├── List/          # 列表类组件
├── Navigation/    # 导航类组件
├── Navbar/        # 导航栏组件（移动端）
├── Tabbar/        # 底部标签栏组件（移动端）
├── Tabs/           # 标签页组件（移动端）
├── Data/          # 数据展示类组件
├── Cell/          # 单元格组件（移动端通用）
└── CellGroup/     # 单元格组合组件（移动端通用）
```

* 组件必须具备跨平台兼容性
* 统一主题样式系统
* 支持暗黑模式
* 组件接口保持一致
* 移动端组件需适配触摸交互

---

### 7.6 移动端组件开发规范（新增）

#### 7.6.1 移动端组件目录结构

```text
/src/components/
├── Navbar/                     # 导航栏组件
│   ├── index.tsx               # 主组件
│   ├── Navbar.tsx              # 核心实现
│   ├── Navbar.css              # 基础样式
│   ├── Navbar.mobile.css       # 移动端专属样式
│   ├── useNavbar.ts            # 状态管理 Hook
│   ├── Navbar.types.ts         # TypeScript 类型
│   └── index.ts                # 统一导出
│
├── Tabbar/                     # 底部标签栏组件
│   ├── index.tsx
│   ├── Tabbar.tsx
│   ├── TabItem.tsx
│   ├── Tabbar.css
│   ├── Tabbar.mobile.css
│   ├── useTabbar.ts
│   └── index.ts
│
├── Cell/                       # 单元格组件
│   ├── Cell.tsx
│   ├── CellGroup.tsx
│   ├── Cell.css
│   └── index.ts
│
├── PullRefresh/                # 下拉刷新组件
│   ├── PullRefresh.tsx
│   ├── PullRefresh.css
│   ├── usePullRefresh.ts
│   └── index.ts
│
├── SwipeCell/                  # 滑动单元格
│   ├── SwipeCell.tsx
│   ├── SwipeCell.css
│   └── index.ts
│
├── FloatingPanel/              # 浮动面板
│   ├── FloatingPanel.tsx
│   ├── FloatingPanel.css
│   └── index.ts
│
├── ActionSheet/                # 动作面板
│   ├── ActionSheet.tsx
│   ├── ActionSheet.css
│   └── index.ts
│
├── ImagePreview/               # 图片预览
│   ├── ImagePreview.tsx
│   ├── ImagePreview.css
│   └── index.ts
│
├── Search/                     # 搜索组件
│   ├── Search.tsx
│   ├── Search.css
│   └── index.ts
│
└── IndexList/                  # 索引列表
    ├── IndexList.tsx
    ├── IndexList.css
    └── index.ts
```

#### 7.6.2 移动端组件设计原则

| 原则 | 说明 | 示例 |
|-----|------|------|
| **触摸友好** | 点击区域 >= 44x44px | 按钮最小高度 44px |
| **手势支持** | 支持滑动手势操作 | 左滑删除、下拉刷新 |
| **动画流畅** | 60fps 动画性能 | 使用 transform/opacity |
| **安全区域** | 适配刘海屏/底部条 | 使用 safe-area-inset |
| **响应式** | 适配不同屏幕尺寸 | 使用 vw/rem 单位 |

#### 7.6.3 移动端组件代码示例

```tsx
// /src/components/Navbar/Navbar.tsx
import React, { useMemo } from 'react';
import { useSafeArea } from '@/mobile/hooks/useSafeArea';
import './Navbar.css';
import './Navbar.mobile.css';

export interface NavbarProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  fixed?: boolean;
  placeholder?: boolean;
  safeArea?: boolean;
  onLeftClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  left,
  right,
  fixed = false,
  placeholder = false,
  safeArea = true,
  onLeftClick,
}) => {
  const { top } = useSafeArea();
  
  const navbarStyle = useMemo(() => ({
    paddingTop: safeArea ? `${top}px` : 0,
  }), [safeArea, top]);

  const content = (
    <div 
      className={['navbar', fixed && 'navbar--fixed'].filter(Boolean).join(' ')}
      style={navbarStyle}
    >
      <div className="navbar__left" onClick={onLeftClick}>
        {left || <span className="navbar__back-icon" />}
      </div>
      <div className="navbar__title">{title}</div>
      <div className="navbar__right">{right}</div>
    </div>
  );

  return (
    <>
      {content}
      {fixed && placeholder && <div className="navbar__placeholder" />}
    </>
  );
};
```

#### 7.6.4 移动端样式规范

```css
/* Navbar.mobile.css */
/* 移动端专属样式 */

.navbar {
  /* 固定高度 */
  height: 44px;
  
  /* 触摸区域优化 */
  min-height: 44px;
  
  /* 适配安全区域 */
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  
  /* 底部边框 */
  border-bottom: 0.5px solid var(--border-color);
  
  /* 点击反馈 */
  -webkit-tap-highlight-color: transparent;
}

.navbar__left,
.navbar__right {
  /* 最小点击区域 */
  min-width: 44px;
  min-height: 44px;
  
  /* Flex 居中 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .navbar {
    background-color: var(--navbar-bg-dark);
    border-bottom-color: var(--border-color-dark);
  }
}
```

---

### 7.7 移动端性能与体验标准（新增）

#### 7.7.1 性能指标

| 指标 | 目标值 | 测量工具 |
|-----|-------|---------|
| FCP (First Contentful Paint) | < 1.5s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| TTI (Time to Interactive) | < 3.5s | Lighthouse |
| 动画帧率 | >= 55fps | Chrome DevTools |
| 内存占用 | < 150MB | Xcode/Android Studio |
| 包体积 | < 10MB (IPA/APK) | 打包后测量 |

#### 7.7.2 渲染优化规范

```typescript
// ✅ 使用 transform 代替 top/left
const style = {
  transform: 'translate3d(100px, 0, 0)', // GPU 加速
};

// ❌ 避免触发重排
const badStyle = {
  left: '100px', // 触发重排
};

// ✅ 使用 will-change 谨慎优化
const optimizedStyle = {
  willChange: 'transform', // 动画前声明
};

// ✅ 虚拟列表处理长列表
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  totalCount={10000}
  itemContent={(index) => <div>Item {index}</div>}
/>;
```

#### 7.7.3 移动端体验规范

| 场景 | 规范 |
|-----|------|
| **点击反馈** | 所有可点击元素必须有 :active 状态 |
| **加载状态** | 列表加载显示骨架屏，按钮加载禁用并显示 loading |
| **空状态** | 空列表显示友好空状态页 |
| **错误处理** | 网络错误显示重试按钮 |
| **手势冲突** | 滑动组件间避免手势冲突 |
| **输入法适配** | 输入框自动滚动到可视区域 |
| **下拉刷新** | 列表支持下拉刷新，显示刷新动画 |
| **上拉加载** | 长列表支持上拉加载更多 |

#### 7.7.4 触摸交互规范

```typescript
// /src/mobile/hooks/useTouchFeedback.ts
import { useCallback } from 'react';

export const useTouchFeedback = () => {
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.96)';
    target.style.transition = 'transform 0.1s';
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(1)';
  }, []);

  return { onTouchStart, onTouchEnd };
};
```

---

### 7.8 移动端安全规范（新增）

#### 7.8.1 数据传输安全

```typescript
// ✅ 强制 HTTPS
const API_BASE_URL = 'https://api.example.com'; // 必须 HTTPS

// ✅ 证书固定（Certificate Pinning）
// capacitor.config.ts
const config: CapacitorConfig = {
  plugins: {
    Http: {
      allowAllCerts: false, // 禁止接受所有证书
    },
  },
};

// ✅ 敏感数据加密存储
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

const secureStorage = {
  async set(key: string, value: string) {
    const encrypted = CryptoJS.AES.encrypt(value, 'SECRET_KEY').toString();
    await Preferences.set({ key, value: encrypted });
  },
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    return CryptoJS.AES.decrypt(value, 'SECRET_KEY').toString(CryptoJS.enc.Utf8);
  },
};
```

#### 7.8.2 代码安全

| 安全措施 | 说明 |
|---------|------|
| 代码混淆 | 使用 ProGuard (Android) / Swift 优化 |
| 反调试检测 | 检测调试器附加 |
| Root/越狱检测 | 检测设备是否被破解 |
| WebView 安全 | 禁止 allowUniversalAccessFromFileURLs |
| 键盘安全 | 敏感输入使用安全键盘 |

```typescript
// /src/mobile/native/plugins/SecurityPlugin/definitions.ts

export interface SecurityPlugin {
  // 检测设备是否被 Root/越狱
  isDeviceSecure(): Promise<{ secure: boolean }>;
  
  // 检测是否在调试模式
  isDebugMode(): Promise<{ debug: boolean }>;
  
  // 启用屏幕防截屏
  preventScreenCapture(): Promise<void>;
  
  // 生物识别认证
  authenticate(options: { reason: string }): Promise<{ success: boolean }>;
}
```

---

### 7.9 Capacitor 配置规范（新增）

#### 7.9.1 capacitor.config.ts 标准配置

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.appname',
  appName: '应用名称',
  webDir: 'dist',
  
  // 服务器配置
  server: {
    // 开发模式使用本地服务器
    url: process.env.NODE_ENV === 'development' 
      ? 'http://192.168.1.100:3000' 
      : undefined,
    cleartext: process.env.NODE_ENV === 'development', // 开发模式允许明文
  },
  
  // WebView 配置
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false, // 禁用链接预览
    scrollEnabled: true,
    backgroundColor: '#ffffff',
  },
  
  android: {
    allowMixedContent: false, // 禁止混合内容
    captureInput: true, // 优化输入体验
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#ffffff',
  },
  
  // 插件配置
  plugins: {
    // 状态栏
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    
    // 导航栏
    NavigationBar: {
      color: '#ffffff',
      style: 'DARK',
    },
    
    // 启动屏
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
    },
    
    // 推送通知
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    
    // 本地通知
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
    
    // HTTP
    Http: {
      enabled: true,
    },
  },
};

export default config;
```

#### 7.9.2 原生工程管理规范

```text
capacitor-project/
├── ios/                          # iOS 工程（只读，不手动修改）
│   ├── App/
│   ├── App.xcodeproj
│   └── Podfile
│
├── android/                      # Android 工程（只读，不手动修改）
│   ├── app/
│   ├── gradle/
│   └── build.gradle
│
├── src-mobile/                   # 原生代码源文件（版本控制）
│   ├── ios/
│   │   ├── AppDelegate.swift     # 自定义 AppDelegate
│   │   ├── NotificationExtension/
│   │   └── Resources/
│   └── android/
│       ├── MainActivity.kt       # 自定义 MainActivity
│       ├── NotificationService/
│       └── res/
│
└── scripts/                      # 同步脚本
    ├── sync-ios.sh
    └── sync-android.sh
```

#### 7.9.3 构建与发布流程

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Build Web
        run: npm run build
        
      - name: Sync iOS
        run: npx cap sync ios
        
      - name: Copy Custom iOS Code
        run: |
          cp -r src-mobile/ios/* ios/App/
          
      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath App.xcarchive archive
            
      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath ios/App/App.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath ./build
            
      - name: Upload to App Store
        run: |
          xcrun altool --upload-app \
            -f ./build/App.ipa \
            -t ios \
            -u ${{ secrets.APPLE_ID }} \
            -p ${{ secrets.APPLE_PASSWORD }}

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Setup JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Build Web
        run: npm run build
        
      - name: Sync Android
        run: npx cap sync android
        
      - name: Copy Custom Android Code
        run: |
          cp -r src-mobile/android/* android/app/src/
          
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleRelease
          
      - name: Sign APK
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: android/app/build/outputs/apk/release
          signingKeyBase64: ${{ secrets.SIGNING_KEY }}
          alias: ${{ secrets.ALIAS }}
          keyStorePassword: ${{ secrets.KEY_STORE_PASSWORD }}
          
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
          packageName: com.company.appname
          releaseFiles: android/app/build/outputs/apk/release/*.apk
          track: production
```

---

## 8. LLM 友好标准（AI 必备）

* Platform 接口必须稳定
* 命名语义化
* 单文件职责明确
* 文档即 Prompt

---

## 9. 架构铁律（V2 版）

### 9.1 通用铁律

1. Platform 是唯一系统入口
2. 微信 / App 能力不可直连
3. 业务不感知运行环境
4. 所有能力可 Mock
5. 同一业务代码跑所有端

### 9.2 移动端专项铁律（新增）

6. **原生能力必须通过 Platform 调用** - 禁止直接调用 Capacitor 插件
7. **移动端组件需适配触摸交互** - 所有可点击元素必须 >= 44x44px
8. **严格管理原生工程** - ios/ android/ 目录由 Capacitor 生成，禁止手动修改
9. **自定义原生代码版本控制** - 所有自定义原生代码存放在 src-mobile/ 目录
10. **强制 HTTPS 通信** - 生产环境禁止明文传输
11. **敏感数据加密存储** - 使用 Preferences 时必须加密
12. **安全区域适配** - 所有页面必须适配刘海屏/底部条
13. **性能指标必须达标** - FCP < 1.5s, LCP < 2.5s, 动画 >= 55fps

---
 
