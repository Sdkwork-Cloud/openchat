# 架构文档技术栈版本统一规范

## 目的
确保所有架构文档中的技术栈版本号保持一致，避免混淆。

## 统一版本号（2026-02-20 更新）

### 核心技术栈
| 技术 | 统一版本 | 说明 |
|------|----------|------|
| React | `^19.0.0` | 所有文档统一使用此版本 |
| React DOM | `^19.0.0` | 与 React 版本一致 |
| TypeScript | `^5.9.0` | 严格模式 |
| Vite | `^7.0.0` | 构建工具 |
| Zustand | `^5.0.0` | 状态管理 |
| Tailwind CSS | `^4.0.0` | 样式方案 |

### 桌面应用技术栈（Tauri）
| 技术 | 统一版本 | 说明 |
|------|----------|------|
| Tauri | `^2.0.0` | 桌面应用框架 |
| @tauri-apps/api | `^2.0.0` | Tauri API |
| @tauri-apps/cli | `^2.0.0` | Tauri CLI |

### 移动应用技术栈（Capacitor）
| 技术 | 统一版本 | 说明 |
|------|----------|------|
| Capacitor | `^7.0.0` | 移动应用框架 |
| @capacitor/core | `^7.0.0` | Capacitor 核心 |
| @capacitor/cli | `^7.0.0` | Capacitor CLI |
| @capacitor/ios | `^7.0.0` | iOS 平台 |
| @capacitor/android | `^7.0.0` | Android 平台 |

### 编辑器技术栈
| 技术 | 统一版本 | 说明 |
|------|----------|------|
| Monaco Editor | `^0.47.0` | 代码编辑器 |
| TipTap | `^2.0.0` | 富文本编辑器 |
| xterm.js | `^5.0.0` | 终端模拟器 |

### 工具库
| 技术 | 统一版本 | 说明 |
|------|----------|------|
| Lucide React | `^0.475.0` | 图标库 |
| classnames | `^2.5.0` | 类名拼接 |
| immer | `^11.0.0` | 不可变数据 |
| JSZip | `^3.10.0` | ZIP 处理 |
| markdown-it | `^14.0.0` | Markdown 解析 |
| date-fns | `^4.0.0` | 日期处理 |
| uuid | `^11.0.0` | UUID 生成 |
| zod | `^3.24.0` | Schema 验证 |

### 开发工具
| 工具 | 统一版本 | 说明 |
|------|----------|------|
| ESLint | `^9.0.0` | 代码检查 |
| Prettier | `^3.0.0` | 代码格式化 |
| Vitest | `^2.0.0` | 测试框架 |
| @testing-library/react | `^16.0.0` | React 测试库 |
| @types/node | `^22.0.0` | Node.js 类型 |
| @types/react | `^19.0.0` | React 类型 |
| @types/react-dom | `^19.0.0` | React DOM 类型 |

## 文档更新清单

### 已更新文档
- [x] architect-standard-react+tauri.md
- [x] architect-standard-react+capacitor.md
- [ ] architect-react+tauri.md（待更新）
- [ ] architect-react+capacitor.md（待更新）

## 更新规则

1. **技术栈表格**：统一使用 `^` 前缀格式
2. **package.json 示例**：所有依赖版本使用统一版本号
3. **代码示例**：确保导入的版本号与统一版本一致
4. **ASCII 架构图**：更新图中显示的技术栈版本

## 注意事项

- 避免使用 `x` 通配符格式（如 `19.2.x`），统一使用 `^` 语义化版本格式
- 所有文档中的同一技术版本号必须完全一致
- 更新文档时同步更新此规范文件

---

**最后更新**: 2026-02-20
**维护者**: SDKWork Team
