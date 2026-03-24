import { Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { AuthManagerService } from '../auth/auth-manager.service';
import { MultiAuthGuard } from '../auth/guards/multi-auth.guard';
import { JwtAuthGuard } from '../../modules/user/guards/jwt-auth.guard';
import { AuthController } from '../../modules/user/auth.controller';
import { UserController } from '../../modules/user/controllers/user.controller';
import { FriendController } from '../../modules/friend/friend.controller';
import { ContactController } from '../../modules/contact/contact.controller';
import { MessageController } from '../../modules/message/message.controller';
import { MessageSearchController } from '../../modules/message/message-search.controller';
import { GroupController } from '../../modules/group/group.controller';
import { ConversationController } from '../../modules/conversation/conversation.controller';
import { RtcAppController } from '../../modules/rtc/rtc-app.controller';
import { RtcAdminController } from '../../modules/rtc/rtc-admin.controller';
import { WukongIMAppController } from '../../modules/wukongim/wukongim-app.controller';
import { WukongIMAdminController } from '../../modules/wukongim/wukongim-admin.controller';
import { AIBotController } from '../../modules/ai-bot/ai-bot.controller';
import { AgentController } from '../../modules/agent/agent.controller';
import { MemoryController } from '../../modules/agent/memory/memory.controller';
import { BotController } from '../../modules/bot-platform/controllers/bot.controller';
import { BotOpenController } from '../../modules/bot-platform/controllers/bot-open.controller';
import { ThirdPartyController } from '../../modules/third-party/third-party.controller';
import { IoTController } from '../../modules/iot/iot.controller';
import { CrawController } from '../../modules/craw/craw.controller';
import { TimelineController } from '../../modules/timeline/timeline.controller';
import {
  IM_ADMIN_API_PREFIX,
  IM_APP_API_PREFIX,
} from './im-api-surface.constants';

const primitiveConstructorSet = new Set<Function>([
  String,
  Number,
  Boolean,
  Array,
  Object,
  Date,
]);

export const IM_APP_OPENAPI_CONTROLLERS: Array<Type<unknown>> = [
  AuthController,
  UserController,
  FriendController,
  ContactController,
  MessageController,
  MessageSearchController,
  GroupController,
  ConversationController,
  RtcAppController,
  WukongIMAppController,
  AIBotController,
  AgentController,
  MemoryController,
  BotController,
  BotOpenController,
  ThirdPartyController,
  IoTController,
  CrawController,
  TimelineController,
];

export const IM_ADMIN_OPENAPI_CONTROLLERS: Array<Type<unknown>> = [
  RtcAdminController,
  WukongIMAdminController,
];

function createNoopProxy(): Record<PropertyKey, unknown> {
  const fn = () => undefined;
  return new Proxy(fn as unknown as Record<PropertyKey, unknown>, {
    get: (_target, property) => {
      if (property === 'then') {
        return undefined;
      }
      return createNoopProxy();
    },
    apply: () => undefined,
  });
}

function createStubProviders(
  controllers: Array<Type<unknown>>,
): Provider[] {
  const providers = new Map<Function, Provider>();

  for (const controller of controllers) {
    const dependencies: Function[] =
      Reflect.getMetadata('design:paramtypes', controller) || [];

    for (const dependency of dependencies) {
      if (!dependency || primitiveConstructorSet.has(dependency)) {
        continue;
      }
      if (!providers.has(dependency)) {
        providers.set(dependency, {
          provide: dependency,
          useValue: createNoopProxy(),
        });
      }
    }
  }

  return Array.from(providers.values());
}

function createGuardStubProvider(guard: Type<unknown>): Provider {
  return {
    provide: guard,
    useValue: {
      canActivate: () => true,
    },
  };
}

@Module({
  controllers: IM_APP_OPENAPI_CONTROLLERS,
  providers: [
    ...createStubProviders(IM_APP_OPENAPI_CONTROLLERS),
    {
      provide: AuthManagerService,
      useValue: createNoopProxy(),
    },
    createGuardStubProvider(MultiAuthGuard),
    createGuardStubProvider(JwtAuthGuard),
  ],
})
export class ImOpenApiSchemaAppModule {}

@Module({
  controllers: IM_ADMIN_OPENAPI_CONTROLLERS,
  providers: [
    ...createStubProviders(IM_ADMIN_OPENAPI_CONTROLLERS),
    createGuardStubProvider(JwtAuthGuard),
  ],
})
export class ImOpenApiSchemaAdminModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),
    RouterModule.register([
      {
        path: IM_APP_API_PREFIX,
        module: ImOpenApiSchemaAppModule,
      },
      {
        path: IM_ADMIN_API_PREFIX,
        module: ImOpenApiSchemaAdminModule,
      },
    ]),
    ImOpenApiSchemaAppModule,
    ImOpenApiSchemaAdminModule,
  ],
})
export class ImOpenApiSchemaRuntimeModule {}
