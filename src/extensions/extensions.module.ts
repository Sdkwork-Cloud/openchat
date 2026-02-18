/**
 * 扩展插件模块
 *
 * 职责：
 * 1. 注册扩展插件核心服务
 * 2. 注册默认用户中心插件
 * 3. 提供扩展插件配置
 * 4. 集成健康检查和生命周期管理
 */

import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ExtensionRegistry } from './core/extension-registry.service';
import { ExtensionConfigValidator } from './core/extension-config.validator';
import { ExtensionLifecycleManager } from './core/extension-lifecycle.manager';
import { ExtensionHealthService } from './core/extension-health.service';
import { DefaultUserCenterExtension } from './user-center/default-user-center.extension';
import { RemoteUserCenterExtension } from './user-center/remote-user-center.extension';
import { UserCenterProxy } from './user-center/user-center.proxy';
import { RedisModule } from '../common/redis/redis.module';
import { UserEntity } from '../modules/user/entities/user.entity';
import { WukongIMModule } from '../modules/wukongim/wukongim.module';
import { UserModule } from '../modules/user/user.module';

export interface ExtensionsModuleOptions {
  /** 是否启用默认用户中心 */
  useDefaultUserCenter?: boolean;
  /** 是否启用远程用户中心 */
  useRemoteUserCenter?: boolean;
  /** 主用户中心插件ID */
  primaryUserCenterId?: string;
  /** 是否启用健康检查 */
  enableHealthCheck?: boolean;
  /** 是否启用自动恢复 */
  enableAutoRecovery?: boolean;
  /** 额外的扩展插件 */
  extensions?: Provider[];
}

@Global()
@Module({})
export class ExtensionsModule {
  static forRoot(options: ExtensionsModuleOptions = {}): DynamicModule {
    const {
      useDefaultUserCenter = true,
      useRemoteUserCenter = false,
      primaryUserCenterId,
      enableHealthCheck = true,
      enableAutoRecovery = true,
      extensions = [],
    } = options;

    const coreProviders: Provider[] = [
      ExtensionRegistry,
      ExtensionConfigValidator,
      ExtensionLifecycleManager,
    ];

    const userCenterProviders: Provider[] = [UserCenterProxy];

    const imports: any[] = [
      ConfigModule,
      EventEmitterModule.forRoot(),
      JwtModule.registerAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET', 'openchat-secret-key'),
          signOptions: { expiresIn: '2h' },
        }),
        inject: [ConfigService],
      }),
    ];

    if (enableHealthCheck) {
      imports.push(ScheduleModule.forRoot());
      coreProviders.push(ExtensionHealthService);
    }

    if (useDefaultUserCenter) {
      userCenterProviders.push(DefaultUserCenterExtension);
      imports.push(
        TypeOrmModule.forFeature([UserEntity]),
        RedisModule,
        WukongIMModule,
        UserModule,
      );
    }

    if (useRemoteUserCenter) {
      userCenterProviders.push(RemoteUserCenterExtension);
    }

    const allProviders = [
      ...coreProviders,
      ...userCenterProviders,
      ...extensions,
    ];

    const allExports = [
      ExtensionRegistry,
      ExtensionConfigValidator,
      ExtensionLifecycleManager,
      UserCenterProxy,
      UserModule,
      WukongIMModule,
      ...(enableHealthCheck ? [ExtensionHealthService] : []),
      ...(useDefaultUserCenter ? [DefaultUserCenterExtension] : []),
      ...(useRemoteUserCenter ? [RemoteUserCenterExtension] : []),
    ];

    return {
      module: ExtensionsModule,
      imports,
      providers: allProviders,
      exports: allExports,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<ExtensionsModuleOptions> | ExtensionsModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ExtensionsModule,
      imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET', 'openchat-secret-key'),
            signOptions: { expiresIn: '2h' },
          }),
          inject: [ConfigService],
        }),
        ScheduleModule.forRoot(),
      ],
      providers: [
        ExtensionRegistry,
        ExtensionConfigValidator,
        ExtensionLifecycleManager,
        ExtensionHealthService,
        UserCenterProxy,
        {
          provide: 'EXTENSIONS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [
        ExtensionRegistry,
        ExtensionConfigValidator,
        ExtensionLifecycleManager,
        ExtensionHealthService,
        UserCenterProxy,
      ],
    };
  }
}
