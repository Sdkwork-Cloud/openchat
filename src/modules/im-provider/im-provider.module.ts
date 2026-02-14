import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WukongIMProvider } from './providers/wukongim/wukongim.provider';
import { IMProviderService } from './im-provider.service';
import { WukongIMModule } from '../wukongim/wukongim.module';

@Global()
@Module({
  imports: [HttpModule, ConfigModule, WukongIMModule],
  providers: [
    IMProviderService,
    WukongIMProvider,
  ],
  exports: [IMProviderService, WukongIMProvider],
})
export class IMProviderModule {}
