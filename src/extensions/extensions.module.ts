import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { RedisModule } from '../common/redis/redis.module';
import { UserEntity } from '../modules/user/entities/user.entity';
import { UserModule } from '../modules/user/user.module';
import { WukongIMModule } from '../modules/wukongim/wukongim.module';
import { ExtensionConfigValidator } from './core/extension-config.validator';
import { ExtensionHealthService } from './core/extension-health.service';
import { ExtensionLifecycleManager } from './core/extension-lifecycle.manager';
import { ExtensionRegistry } from './core/extension-registry.service';
import { EXTENSIONS_OPTIONS, ExtensionsModuleOptions } from './extensions.options';
import { DefaultUserCenterExtension } from './user-center/default-user-center.extension';
import { RemoteUserCenterExtension } from './user-center/remote-user-center.extension';
import { UserCenterProxy } from './user-center/user-center.proxy';

export type { ExtensionsModuleOptions } from './extensions.options';

@Global()
@Module({})
export class ExtensionsModule {
  static forRoot(options: ExtensionsModuleOptions = {}): DynamicModule {
    const {
      useDefaultUserCenter = true,
      useRemoteUserCenter = false,
      enableHealthCheck = true,
      extensions = [],
    } = options;

    const coreProviders: Provider[] = [
      {
        provide: EXTENSIONS_OPTIONS,
        useValue: options,
      },
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
        CommonModule,
        RedisModule,
        WukongIMModule,
        UserModule,
      );
    }

    if (useRemoteUserCenter) {
      userCenterProviders.push(RemoteUserCenterExtension);
    }

    return {
      module: ExtensionsModule,
      imports,
      providers: [
        ...coreProviders,
        ...userCenterProviders,
        ...extensions,
      ],
      exports: [
        ExtensionRegistry,
        ExtensionConfigValidator,
        ExtensionLifecycleManager,
        UserCenterProxy,
        UserModule,
        WukongIMModule,
        ...(enableHealthCheck ? [ExtensionHealthService] : []),
        ...(useDefaultUserCenter ? [DefaultUserCenterExtension] : []),
        ...(useRemoteUserCenter ? [RemoteUserCenterExtension] : []),
      ],
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
          provide: EXTENSIONS_OPTIONS,
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
