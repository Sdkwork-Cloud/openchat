import { AnyMediaResource, ImageMediaResource } from '../im-provider/media-resource.interface';

/**
 * 联系人类型
 */
export type ContactType = 'user' | 'group';

/**
 * 联系人来源
 * - friend: 来自好友关系
 * - group: 来自群组
 * - manual: 手动添加
 */
export type ContactSource = 'friend' | 'group' | 'manual';

/**
 * 联系人状态
 */
export type ContactStatus = 'active' | 'blocked' | 'deleted';

/**
 * 联系人实体
 * 统一的联系人视图，整合好友、群组和手动添加的联系人
 * 所有展示信息都在这里，不重复存储关系数据
 */
export class Contact {
  id: string;
  uuid?: string;
  userId: string; // 联系人所属用户ID
  contactId: string; // 联系人ID（用户ID或群组ID）
  type: ContactType;
  /**
   * 联系人来源
   * 用于区分联系人是来自好友、群组还是手动添加
   */
  source: ContactSource;
  name: string; // 联系人名称（昵称或群组名）
  avatar?: string | ImageMediaResource; // 联系人头像
  remark?: string; // 备注名
  status: ContactStatus;
  isFavorite: boolean; // 是否收藏
  tags?: string[]; // 标签
  extraInfo?: Record<string, any>; // 额外信息
  lastContactTime?: Date; // 最后联系时间
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建联系人请求
 */
export interface CreateContactRequest {
  userId: string;
  contactId: string;
  type: ContactType;
  source?: ContactSource;
  name: string;
  remark?: string;
  tags?: string[];
}

/**
 * 更新联系人请求
 */
export interface UpdateContactRequest {
  name?: string;
  remark?: string;
  tags?: string[];
  isFavorite?: boolean;
  status?: ContactStatus;
}

/**
 * 联系人查询参数
 */
export interface ContactQueryParams {
  userId: string;
  type?: ContactType;
  source?: ContactSource;
  status?: ContactStatus;
  isFavorite?: boolean;
  tag?: string;
  keyword?: string; // 搜索关键词
  limit?: number;
  offset?: number;
}

/**
 * 联系人管理服务接口
 * 提供统一的联系人管理功能
 */
export interface ContactManager {
  /**
   * 创建联系人
   */
  createContact(request: CreateContactRequest): Promise<Contact>;

  /**
   * 获取联系人详情
   */
  getContactById(id: string): Promise<Contact | null>;

  /**
   * 获取用户的联系人列表
   */
  getContactsByUserId(params: ContactQueryParams): Promise<Contact[]>;

  /**
   * 获取用户与特定目标的联系人
   */
  getContactByTarget(userId: string, contactId: string, type: ContactType): Promise<Contact | null>;

  /**
   * 更新联系人
   */
  updateContact(id: string, request: UpdateContactRequest): Promise<Contact | null>;

  /**
   * 删除联系人
   */
  deleteContact(id: string): Promise<boolean>;

  /**
   * 批量删除联系人
   */
  batchDeleteContacts(ids: string[]): Promise<boolean>;

  /**
   * 设置/取消收藏
   */
  setFavorite(id: string, isFavorite: boolean): Promise<boolean>;

  /**
   * 设置备注
   */
  setRemark(id: string, remark: string): Promise<boolean>;

  /**
   * 添加标签
   */
  addTag(id: string, tag: string): Promise<boolean>;

  /**
   * 移除标签
   */
  removeTag(id: string, tag: string): Promise<boolean>;

  /**
   * 更新最后联系时间
   */
  updateLastContactTime(id: string): Promise<boolean>;

  /**
   * 搜索联系人
   */
  searchContacts(userId: string, keyword: string): Promise<Contact[]>;

  /**
   * 获取联系人统计
   */
  getContactStats(userId: string): Promise<{
    total: number;
    userCount: number;
    groupCount: number;
    favoriteCount: number;
    blockedCount: number;
  }>;
}
