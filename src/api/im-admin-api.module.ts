import { Module } from '@nestjs/common';
import { ImAdminImServerApiModule } from './im-admin/im-admin-im-server-api.module';
import { ImAdminRealtimeApiModule } from './im-admin/im-admin-realtime-api.module';

@Module({
  imports: [ImAdminImServerApiModule, ImAdminRealtimeApiModule],
})
export class ImAdminApiModule {}
