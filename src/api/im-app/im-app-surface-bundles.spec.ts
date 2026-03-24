import { MODULE_METADATA } from '@nestjs/common/constants';
import { AIBotModule } from '../../modules/ai-bot/ai-bot.module';
import { AgentModule } from '../../modules/agent/agent.module';
import { BotPlatformModule } from '../../modules/bot-platform/bot-platform.module';
import { ContactModule } from '../../modules/contact/contact.module';
import { ConversationModule } from '../../modules/conversation/conversation.module';
import { CrawModule } from '../../modules/craw/craw.module';
import { FriendModule } from '../../modules/friend/friend.module';
import { GroupModule } from '../../modules/group/group.module';
import { IoTModule } from '../../modules/iot/iot.module';
import { MessageModule } from '../../modules/message/message.module';
import { RtcAppApiModule } from '../../modules/rtc/rtc-app-api.module';
import { ThirdPartyModule } from '../../modules/third-party/third-party.module';
import { TimelineModule } from '../../modules/timeline/timeline.module';
import { UserModule } from '../../modules/user/user.module';
import { WukongIMAppApiModule } from '../../modules/wukongim/wukongim-app-api.module';
import { ImAppAutomationApiModule } from './im-app-automation-api.module';
import { ImAppIdentityApiModule } from './im-app-identity-api.module';
import { ImAppIntegrationApiModule } from './im-app-integration-api.module';
import { ImAppMessagingApiModule } from './im-app-messaging-api.module';
import { ImAppRealtimeApiModule } from './im-app-realtime-api.module';
import { ImAppSocialApiModule } from './im-app-social-api.module';

describe('ImApp surface bundles', () => {
  it('should keep identity APIs in the identity bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppIdentityApiModule) ||
      [];

    expect(imports).toEqual([UserModule, FriendModule, ContactModule]);
  });

  it('should keep messaging APIs in the messaging bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppMessagingApiModule) ||
      [];

    expect(imports).toEqual([MessageModule, GroupModule, ConversationModule]);
  });

  it('should keep realtime APIs in the realtime bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppRealtimeApiModule) ||
      [];

    expect(imports).toEqual([RtcAppApiModule, WukongIMAppApiModule]);
  });

  it('should keep automation APIs in the automation bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppAutomationApiModule) ||
      [];

    expect(imports).toEqual([AIBotModule, AgentModule, BotPlatformModule]);
  });

  it('should keep integration APIs in the integration bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppIntegrationApiModule) ||
      [];

    expect(imports).toEqual([ThirdPartyModule, IoTModule, CrawModule]);
  });

  it('should keep social APIs in the social bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppSocialApiModule) || [];

    expect(imports).toEqual([TimelineModule]);
  });
});
