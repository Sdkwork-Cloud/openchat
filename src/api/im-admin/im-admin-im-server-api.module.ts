import { Module } from '@nestjs/common';
import { WukongIMAdminApiModule } from '../../modules/wukongim/wukongim-admin-api.module';

@Module({
  imports: [WukongIMAdminApiModule],
})
export class ImAdminImServerApiModule {}
