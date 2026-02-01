import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IMProviderFactoryImpl, imProviderFactory } from './im-provider.base';
import { WukongIMProvider } from './providers/wukongim/wukongim.provider';
import { WukongIMProviderV2 } from './providers/wukongim/wukongim.provider.v2';
import { IMProviderService } from './im-provider.service';
import { WukongIMAdapter } from './wukongim.adapter';

@Global()
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: 'IMProviderFactory',
      useValue: imProviderFactory,
    },
    IMProviderService,
    WukongIMAdapter,
  ],
  exports: ['IMProviderFactory', IMProviderService, WukongIMAdapter],
})
export class IMProviderModule {
  constructor() {
    // 注册默认Provider
    this.registerDefaultProviders();
  }

  private registerDefaultProviders() {
    // 注册WukongIM Provider（使用V2版本）
    imProviderFactory.registerProvider('wukongim', WukongIMProviderV2);
    // 保留旧版本兼容
    imProviderFactory.registerProvider('wukongim-v1', WukongIMProvider);
  }
}
