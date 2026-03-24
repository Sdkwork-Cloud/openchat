import { Module } from '@nestjs/common';
import { WukongIMModule } from './wukongim.module';
import { WukongIMAdminController } from './wukongim-admin.controller';

@Module({
  imports: [WukongIMModule],
  controllers: [WukongIMAdminController],
})
export class WukongIMAdminApiModule {}
