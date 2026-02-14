/**
 * 第三方平台模块
 * 提供Telegram、WhatsApp等第三方平台集成
 */

// 实体
export { ThirdPartyContact } from './third-party-contact.entity';
export { ThirdPartyMessage } from './third-party-message.entity';

// 接口
export {
  ThirdPartyMessage as IThirdPartyMessage,
  ThirdPartyContact as IThirdPartyContact,
  ThirdPartyAdapter,
  ThirdPartyManager,
} from './third-party.interface';

// 适配器
export { TelegramAdapter } from './telegram.adapter';
export { WhatsAppAdapter } from './whatsapp.adapter';

// 服务
export { ThirdPartyService } from './third-party.service';

// 控制器
export { ThirdPartyController } from './third-party.controller';

// 模块
export { ThirdPartyModule } from './third-party.module';
