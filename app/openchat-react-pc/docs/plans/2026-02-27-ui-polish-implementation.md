# UI 打磨实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全面提升 OpenChat React PC 应用的 UI 质感，包括 Design Token 统一、组件微交互优化、加载状态增强

**Architecture:** 采用渐进式优化策略，分 4 个阶段实施：

- Phase 1: 基础改进（CSS 变量、圆角、阴影）
- Phase 2: 组件优化（Button、Input、Card）
- Phase 3: 界面打磨（聊天界面、侧边栏）
- Phase 4: 细节完善（空状态、动画）

**Tech Stack:** React 18+, TypeScript 5+, Tailwind CSS 4+, CSS Variables

---

## Phase 1: 基础改进

### Task 1: 更新 CSS 变量系统

**Files:**

- Modify: `src/index.css:1-200`

**Step 1: 添加新的过渡变量**

```css
/* 在 :root 中添加 */
--transition-fast: 150ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
```

**Step 2: 更新阴影变量**

```css
/* 更新阴影层次 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4);
--shadow-md:
  0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
--shadow-lg:
  0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.6);
--shadow-xl:
  0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.7);
--shadow-glow: 0 0 25px rgba(59, 130, 246, 0.35);
```

**Step 3: 运行 lint 检查**

```bash
npm run lint
```

**Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): enhance shadow and transition tokens"
```

---

### Task 2: 统一圆角系统

**Files:**

- Modify: `src/index.css:140-148`

**Step 1: 确认圆角变量当前圆已存在**

检查角变量：

- `--radius-xs: 4px`
- `--radius-sm: 6px`
- `--radius-md: 8px`
- `--radius-lg: 12px`
- `--radius-xl: 16px`
- `--radius-2xl: 20px`
- `--radius-full: 9999px`

**Step 2: 在 index.css 中添加圆角常量说明注释**

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "docs: document radius token system"
```

---

## Phase 2: 组件优化

### Task 3: Button 组件微交互增强

**Files:**

- Modify: `src/components/ui/Button/index.tsx:115-145`

**Step 1: 更新基础样式**

```typescript
const classes = [
  // 基础样式
  "inline-flex items-center justify-center font-medium transition-all duration-200",
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-bg-primary",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
  // 微交互
  "active:scale-[0.98] active:brightness-90 transform",
  // ...其他样式
];
```

**Step 2: 更新 variantStyles 增加 hover 效果**

```typescript
const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  // ...其他变体
};
```

**Step 3: 运行测试**

```bash
npm test -- src/components/ui/Button/Button.test.tsx
```

**Step 4: Commit**

```bash
git add src/components/ui/Button/index.tsx
git commit -m "feat(ui): enhance button micro-interactions"
```

---

### Task 4: Input 组件样式统一

**Files:**

- Modify: `src/components/ui/Input/index.tsx`

**Step 1: 更新 Input 组件样式**

在 Input 组件的 className 中添加：

```css
bg-bg-tertiary/80 border border-border rounded-lg
focus:border-primary focus:ring-2 focus:ring-primary/20
transition-all duration-200
```

**Step 2: 检查是否有样式冲突**

确保没有覆盖 focus 效果

**Step 3: Commit**

```bash
git add src/components/ui/Input/index.tsx
git commit -f "feat(ui): unify input styles with design tokens"
```

---

### Task 5: Card 组件增强

**Files:**

- Modify: `src/components/ui/Card/index.tsx`

**Step 1: 添加渐变和悬浮效果**

```typescript
// 在 Card 组件中添加
className={cn(
  "bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl border border-border",
  "hover:shadow-xl hover:border-primary/20 hover:-translate-y-0.5",
  "transition-all duration-300",
  className
)}
```

**Step 2: Commit**

```bash
git add src/components/ui/Card/index.tsx
git commit -f "feat(ui): enhance card component with hover effects"
```

---

## Phase 3: 界面打磨

### Task 6: 会话列表优化

**Files:**

- Modify: `src/modules/im/components/ConversationList.tsx`
- Modify: `src/modules/im/components/ConversationItem.tsx`

**Step 1: 更新 ConversationItem 悬浮效果**

在 ConversationItem 中添加：

```css
hover:bg-bg-hover hover:translate-x-1
transition-all duration-200
```

**Step 2: 更新选中状态效果**

```css
isSelected && 'bg-primary-soft shadow-[0_0_20px_rgba(59,130,246,0.2)] border-l-2 border-primary'
```

**Step 3: 更新搜索框聚焦效果**

```css
focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200
```

**Step 4: Commit**

```bash
git add src/modules/im/components/ConversationList.tsx src/modules/im/components/ConversationItem.tsx
git commit -f "feat(ui): enhance conversation list interactions"
```

---

### Task 7: 消息气泡优化

**Files:**

- Modify: `src/modules/im/components/MessageBubble.tsx`

**Step 1: 更新用户消息气泡样式**

```css
bg-primary text-white rounded-2xl rounded-tr-sm
hover:shadow-lg hover:shadow-primary/20
transition-all duration-200
```

**Step 2: 更新 AI 消息气泡样式**

```css
bg-bg-tertiary text-text-primary rounded-2xl rounded-tl-sm
border border-border hover:border-primary/30
transition-all duration-200
```

**Step 3: 优化发送状态动画**

```css
animate-pulse-slow
```

**Step 4: Commit**

```bash
git add src/modules/im/components/MessageBubble.tsx
git commit -f "feat(ui): enhance message bubble interactions"
```

---

### Task 8: 聊天输入框优化

**Files:**

- Modify: `src/modules/im/components/ChatInput.tsx`

**Step 1: 更新工具栏按钮悬浮效果**

```css
hover:text-primary hover:bg-bg-hover
transition-all duration-200
```

**Step 2: 更新发送按钮效果**

```css
hover:bg-primary-hover hover:scale-105 hover:shadow-lg
active:scale-[0.98]
transition-all duration-200
```

**Step 3: Commit**

```bash
git add src/modules/im/components/ChatInput.tsx
git commit -f "feat(ui): enhance chat input interactions"
```

---

### Task 9: 侧边栏优化

**Files:**

- Modify: `src/components/desktop/Sidebar.tsx`

**Step 1: 更新导航项悬浮效果**

```css
hover:bg-bg-hover hover:translate-x-1
transition-all duration-200
```

**Step 2: 更新选中状态**

```css
bg-primary-soft shadow-[inset_0_0_20px_rgba(59,130,246,0.15)]
border-l-2 border-primary
```

**Step 3: 更新 Logo 悬浮效果**

```css
group-hover:scale-105 group-hover:rotate-3
transition-transform duration-300
```

**Step 4: Commit**

```bash
git add src/components/desktop/Sidebar.tsx
git commit -f "feat(ui): enhance sidebar navigation effects"
```

---

## Phase 4: 细节完善

### Task 10: 骨架屏加载状态

**Files:**

- Modify: `src/components/ui/Skeleton/index.tsx`

**Step 1: 检查现有 Skeleton 组件**

确认 `src/components/ui/Skeleton/index.tsx` 存在

**Step 2: 创建会话列表骨架屏测试**

创建测试文件验证组件正常工作

**Step 3: 在 ConversationList 中添加加载状态**

在数据加载时显示骨架屏

**Step 4: Commit**

```bash
git add src/modules/im/components/ConversationList.tsx
git commit -f "feat(ui): add skeleton loading to conversation list"
```

---

### Task 11: 空状态优化

**Files:**

- Modify: `src/modules/im/components/EmptyChat.tsx`

**Step 1: 更新 EmptyChat 组件**

添加更好的视觉设计和快捷操作按钮：

```tsx
<div className="flex flex-col items-center justify-center h-full">
  <div className="w-24 h-24 mb-6 rounded-full bg-primary-soft flex items-center justify-center">
    <ChatIcon className="w-12 h-12 text-primary" />
  </div>
  <h3 className="text-lg font-medium text-text-primary mb-2">暂无消息</h3>
  <p className="text-sm text-text-muted mb-6">开始与 AI 助手对话吧</p>
  <Button variant="primary">发起对话</Button>
</div>
```

**Step 2: Commit**

```bash
git add src/modules/im/components/EmptyChat.tsx
git commit -f "feat(ui): enhance empty chat state"
```

---

### Task 12: 动画系统统一

**Files:**

- Modify: `src/index.css`

**Step 1: 添加全局动画**

```css
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-in-from-right {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in var(--transition-normal) ease-out;
}

.animate-slide-in-from-right {
  animation: slide-in-from-right var(--transition-slow) ease-out;
}

.animate-scale-in {
  animation: scale-in var(--transition-normal) ease-out;
}

.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -f "feat(ui): add unified animation system"
```

---

## 验收测试

### 测试清单

1. [ ] Design Token 系统完整
2. [ ] Button 组件有流畅的 hover/active 效果
3. [ ] Input 组件有清晰的 focus 状态
4. [ ] 消息气泡有悬浮效果
5. [ ] 侧边栏导航有动画效果
6. [ ] 骨架屏加载状态正常
7. [ ] 空状态组件美观
8. [ ] 所有动画过渡流畅（200-300ms）
9. [ ] 深色主题层次分明

### 运行测试

```bash
# 运行所有测试
npm test

# 运行 lint
npm run lint

# 运行 build 检查
npm run build
```

---

## 计划完成

**Plan complete and saved to `docs/plans/2026-02-27-ui-polish-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
