/**
 * Contacts 模块入口
 *
 * 职责：
 * 1. 导出模块公共 API
 * 2. 导出页面组件
 * 3. 导出类型定义
 */

// 页面
export { ContactsPage } from './pages/ContactsPage';

// 实体类型
export type {
  Friend,
  Group,
  ContactTab,
  FriendFilter,
} from './entities/contact.entity';

// Hooks
export { useContacts } from './hooks/useContacts';
