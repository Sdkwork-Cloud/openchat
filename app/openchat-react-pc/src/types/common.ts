/**
 * 通用类型定义
 * 
 * 企业级前端架构标准类型
 */

// ==================== API 响应标准 ====================

/**
 * API 统一响应结构
 * 所有后端接口返回的数据结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

/**
 * 分页查询参数
 * 所有列表查询的基础参数
 */
export interface PageQuery {
  page: number;
  size: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * 分页结果结构
 */
export interface PageResult<T = unknown> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * 分页响应包装
 */
export type PageResponse<T> = ApiResponse<PageResult<T>>;

// ==================== 组件 Props 基础类型 ====================

/**
 * 组件基础 Props
 * 所有组件都应继承此接口
 */
export interface BaseComponentProps {
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * 表单组件基础 Props
 */
export interface BaseFormProps<T = unknown> extends BaseComponentProps {
  /** 表单值 */
  value?: T;
  /** 默认值 */
  defaultValue?: T;
  /** 值变化回调 */
  onChange?: (value: T) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 占位提示 */
  placeholder?: string;
}

/**
 * 列表组件基础 Props
 */
export interface BaseListProps<T = unknown> extends BaseComponentProps {
  /** 数据源 */
  dataSource: T[];
  /** 加载状态 */
  loading?: boolean;
  /** 空状态提示 */
  emptyText?: string;
  /** 点击项回调 */
  onItemClick?: (item: T, index: number) => void;
}

// ==================== 事件类型 ====================

/**
 * 分页变化事件
 */
export interface PaginationChangeEvent {
  page: number;
  size: number;
}

/**
 * 排序变化事件
 */
export interface SortChangeEvent {
  field: string;
  order: 'asc' | 'desc' | null;
}

/**
 * 筛选变化事件
 */
export interface FilterChangeEvent {
  [key: string]: unknown;
}

// ==================== 表格专用类型 ====================

/**
 * 表格列定义
 */
export interface TableColumn<T = unknown> {
  /** 列标识 */
  key: string;
  /** 列标题 */
  title: string;
  /** 数据字段 */
  dataIndex?: keyof T | string;
  /** 列宽 */
  width?: number | string;
  /** 是否固定 */
  fixed?: 'left' | 'right';
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义渲染 */
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  /** 自定义单元格类名 */
  cellClassName?: string | ((record: T, index: number) => string);
}

/**
 * 表格行选择配置
 */
export interface TableRowSelection<T = unknown> {
  /** 选中行keys */
  selectedRowKeys?: string[];
  /** 选中变化回调 */
  onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否显示选择列 */
  showSelectAll?: boolean;
}

/**
 * 表格分页配置
 */
export interface TablePagination {
  /** 当前页 */
  page?: number;
  /** 每页条数 */
  size?: number;
  /** 总条数 */
  total?: number;
  /** 可选每页条数 */
  pageSizeOptions?: number[];
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean;
  /** 是否显示总条数 */
  showTotal?: boolean;
  /** 分页变化回调 */
  onChange?: (page: number, size: number) => void;
}

// ==================== 业务类型 ====================

/**
 * 用户基础信息
 */
export interface UserBaseInfo {
  uid: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}

/**
 * 会话基础信息
 */
export interface ConversationBaseInfo {
  id: string;
  name: string;
  avatar?: string;
  type: 'single' | 'group';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

/**
 * 消息基础信息
 */
export interface MessageBaseInfo {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'read' | 'failed';
}

// ==================== 工具类型 ====================

/**
 * 可空类型
 */
export type Nullable<T> = T | null;

/**
 * 可选类型
 */
export type Optional<T> = T | undefined;

/**
 * 异步函数返回类型
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = 
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

/**
 * 对象键值类型
 */
export type KeyValue<T = unknown> = Record<string, T>;
