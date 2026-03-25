import { Module } from '@nestjs/common';
import { ImAdminImServerApiModule } from './im-admin/im-admin-im-server-api.module';
import { ImAdminPlatformApiModule } from './im-admin/im-admin-platform-api.module';
import { ImAdminRealtimeApiModule } from './im-admin/im-admin-realtime-api.module';

@Module({
  imports: [
    ImAdminPlatformApiModule,
    ImAdminImServerApiModule,
    ImAdminRealtimeApiModule,
  ],
})
export class ImAdminApiModule {}
