/**
 * UI 组件库入口
 *
 * 统一导出所有基础UI组件
 */

// 基础组件
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonShape } from './Button';

export { Input } from './Input';
export type { InputProps, InputSize, InputVariant } from './Input';

export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

// 富文本编辑器
export { RichTextEditor } from './RichTextEditor';
export type { RichTextEditorProps, RichTextEditorRef } from './RichTextEditor';

// Markdown 渲染器
export { MarkdownRenderer } from './MarkdownRenderer';
export type { MarkdownRendererProps } from './MarkdownRenderer';

// 重新导出类型
export type {
  // API 类型
  ApiResponse,
  PageQuery,
  PageResult,
  PageResponse,
  
  // 组件基础类型
  BaseComponentProps,
  BaseFormProps,
  BaseListProps,
  
  // 事件类型
  PaginationChangeEvent,
  SortChangeEvent,
  FilterChangeEvent,
  
  // 表格类型
  TableColumn,
  TableRowSelection,
  TablePagination,
  
  // 业务类型
  UserBaseInfo,
  ConversationBaseInfo,
  MessageBaseInfo,
} from '../../types/common';
