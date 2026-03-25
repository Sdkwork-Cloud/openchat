import { MODULE_METADATA } from '@nestjs/common/constants';
import { ImAdminApiModule } from './im-admin-api.module';
import { ImAdminImServerApiModule } from './im-admin/im-admin-im-server-api.module';
import { ImAdminPlatformApiModule } from './im-admin/im-admin-platform-api.module';
import { ImAdminRealtimeApiModule } from './im-admin/im-admin-realtime-api.module';

describe('ImAdminApiModule', () => {
  it('should compose the admin API surface from dedicated admin submodules only', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAdminApiModule) || [];

    expect(imports).toEqual([
      ImAdminPlatformApiModule,
      ImAdminImServerApiModule,
      ImAdminRealtimeApiModule,
    ]);
  });
});
