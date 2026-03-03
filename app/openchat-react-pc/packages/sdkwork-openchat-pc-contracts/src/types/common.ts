/**
 * 閫氱敤绫诲瀷瀹氫箟
 * 
 * 浼佷笟绾у墠绔灦鏋勬爣鍑嗙被鍨? */

// ==================== API 鍝嶅簲鏍囧噯 ====================

/**
 * Base entity shared by business modules.
 */
export interface BaseEntity {
  id: string;
  createTime?: number;
  updateTime?: number;
}

/**
 * API 缁熶竴鍝嶅簲缁撴瀯
 * 鎵€鏈夊悗绔帴鍙ｈ繑鍥炵殑鏁版嵁缁撴瀯
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

/**
 * 鍒嗛〉鏌ヨ鍙傛暟
 * 鎵€鏈夊垪琛ㄦ煡璇㈢殑鍩虹鍙傛暟
 */
export interface PageQuery {
  page: number;
  size: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * 鍒嗛〉缁撴灉缁撴瀯
 */
export interface PageResult<T = unknown> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * 鍒嗛〉鍝嶅簲鍖呰
 */
export type PageResponse<T> = ApiResponse<PageResult<T>>;

// ==================== 缁勪欢 Props 鍩虹绫诲瀷 ====================

/**
 * 缁勪欢鍩虹 Props
 * 鎵€鏈夌粍浠堕兘搴旂户鎵挎鎺ュ彛
 */
export interface BaseComponentProps {
  /** 鑷畾涔夌被鍚?*/
  className?: string;
  /** 鑷畾涔夋牱寮?*/
  style?: React.CSSProperties;
  /** 瀛愬厓绱?*/
  children?: React.ReactNode;
}

/**
 * 琛ㄥ崟缁勪欢鍩虹 Props
 */
export interface BaseFormProps<T = unknown> extends BaseComponentProps {
  /** 琛ㄥ崟鍊?*/
  value?: T;
  /** 榛樿鍊?*/
  defaultValue?: T;
  /** 鍊煎彉鍖栧洖璋?*/
  onChange?: (value: T) => void;
  /** 鏄惁绂佺敤 */
  disabled?: boolean;
  /** 鏄惁鍙 */
  readOnly?: boolean;
  /** 鍗犱綅鎻愮ず */
  placeholder?: string;
}

/**
 * 鍒楄〃缁勪欢鍩虹 Props
 */
export interface BaseListProps<T = unknown> extends BaseComponentProps {
  /** 鏁版嵁婧?*/
  dataSource: T[];
  /** 鍔犺浇鐘舵€?*/
  loading?: boolean;
  /** 绌虹姸鎬佹彁绀?*/
  emptyText?: string;
  /** 鐐瑰嚮椤瑰洖璋?*/
  onItemClick?: (item: T, index: number) => void;
}

// ==================== 浜嬩欢绫诲瀷 ====================

/**
 * 鍒嗛〉鍙樺寲浜嬩欢
 */
export interface PaginationChangeEvent {
  page: number;
  size: number;
}

/**
 * 鎺掑簭鍙樺寲浜嬩欢
 */
export interface SortChangeEvent {
  field: string;
  order: 'asc' | 'desc' | null;
}

/**
 * 绛涢€夊彉鍖栦簨浠? */
export interface FilterChangeEvent {
  [key: string]: unknown;
}

// ==================== 琛ㄦ牸涓撶敤绫诲瀷 ====================

/**
 * 琛ㄦ牸鍒楀畾涔? */
export interface TableColumn<T = unknown> {
  /** 鍒楁爣璇?*/
  key: string;
  /** 鍒楁爣棰?*/
  title: string;
  /** 鏁版嵁瀛楁 */
  dataIndex?: keyof T | string;
  /** 鍒楀 */
  width?: number | string;
  /** 鏄惁鍥哄畾 */
  fixed?: 'left' | 'right';
  /** 瀵归綈鏂瑰紡 */
  align?: 'left' | 'center' | 'right';
  /** 鏄惁鍙帓搴?*/
  sortable?: boolean;
  /** 鑷畾涔夋覆鏌?*/
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  /** 鑷畾涔夊崟鍏冩牸绫诲悕 */
  cellClassName?: string | ((record: T, index: number) => string);
}

/**
 * 琛ㄦ牸琛岄€夋嫨閰嶇疆
 */
export interface TableRowSelection<T = unknown> {
  /** 閫変腑琛宬eys */
  selectedRowKeys?: string[];
  /** 閫変腑鍙樺寲鍥炶皟 */
  onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  /** 鏄惁澶氶€?*/
  multiple?: boolean;
  /** 鏄惁鏄剧ず閫夋嫨鍒?*/
  showSelectAll?: boolean;
}

/**
 * 琛ㄦ牸鍒嗛〉閰嶇疆
 */
export interface TablePagination {
  /** 褰撳墠椤?*/
  page?: number;
  /** 姣忛〉鏉℃暟 */
  size?: number;
  /** 鎬绘潯鏁?*/
  total?: number;
  /** 鍙€夋瘡椤垫潯鏁?*/
  pageSizeOptions?: number[];
  /** 鏄惁鏄剧ず蹇€熻烦杞?*/
  showQuickJumper?: boolean;
  /** 鏄惁鏄剧ず鎬绘潯鏁?*/
  showTotal?: boolean;
  /** 鍒嗛〉鍙樺寲鍥炶皟 */
  onChange?: (page: number, size: number) => void;
}

// ==================== 涓氬姟绫诲瀷 ====================

/**
 * 鐢ㄦ埛鍩虹淇℃伅
 */
export interface UserBaseInfo {
  uid: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
}

/**
 * 浼氳瘽鍩虹淇℃伅
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
 * 娑堟伅鍩虹淇℃伅
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

// ==================== 宸ュ叿绫诲瀷 ====================

/**
 * 鍙┖绫诲瀷
 */
export type Nullable<T> = T | null;

/**
 * 鍙€夌被鍨? */
export type Optional<T> = T | undefined;

/**
 * 寮傛鍑芥暟杩斿洖绫诲瀷
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = 
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

/**
 * 瀵硅薄閿€肩被鍨? */
export type KeyValue<T = unknown> = Record<string, T>;

