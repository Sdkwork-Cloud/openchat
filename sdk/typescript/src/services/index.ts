/**
 * 服务层入口
 * 提供标准化的服务接口
 */

// ==================== API服务 ====================
export { ApiService } from './api-service';

// ==================== Craw服务 ====================
export { CrawService, createCrawService } from './craw-service';

// ==================== IM服务 ====================
export {
  IMServiceEvent,
} from './im-service';

export type {
  IIMService,
  IMServiceConfig,
  CreateConversationParams,
  UpdateConversationParams,
} from './im-service';

export { WukongIMService, WukongIMServiceFactory } from './im-service-wukong';

// ==================== 服务工厂 ====================
import { IIMService } from './im-service';
import { WukongIMService } from './im-service-wukong';

export enum IMServiceType {
  WUKONG = 'wukong',
}

export class IMServiceFactory {
  static create(type: IMServiceType = IMServiceType.WUKONG): IIMService {
    switch (type) {
      case IMServiceType.WUKONG:
        return new WukongIMService();
      default:
        throw new Error(`Unsupported IM service type: ${type}`);
    }
  }
}
