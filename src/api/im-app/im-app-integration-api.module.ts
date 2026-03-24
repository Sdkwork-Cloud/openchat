import { Module } from '@nestjs/common';
import { CrawModule } from '../../modules/craw/craw.module';
import { IoTModule } from '../../modules/iot/iot.module';
import { ThirdPartyModule } from '../../modules/third-party/third-party.module';

@Module({
  imports: [ThirdPartyModule, IoTModule, CrawModule],
})
export class ImAppIntegrationApiModule {}
