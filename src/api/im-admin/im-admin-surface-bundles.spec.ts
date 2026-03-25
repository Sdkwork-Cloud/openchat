import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminModule } from '../../modules/admin/admin.module';
import { RtcAdminApiModule } from '../../modules/rtc/rtc-admin-api.module';
import { WukongIMAdminApiModule } from '../../modules/wukongim/wukongim-admin-api.module';
import { ImAdminImServerApiModule } from './im-admin-im-server-api.module';
import { ImAdminPlatformApiModule } from './im-admin-platform-api.module';
import { ImAdminRealtimeApiModule } from './im-admin-realtime-api.module';

describe('ImAdmin surface bundles', () => {
  it('should keep platform admin APIs in the platform bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAdminPlatformApiModule) ||
      [];

    expect(imports).toEqual([AdminModule]);
  });

  it('should keep IM server admin APIs in the IM server bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAdminImServerApiModule) ||
      [];

    expect(imports).toEqual([WukongIMAdminApiModule]);
  });

  it('should keep RTC admin APIs in the realtime admin bundle', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAdminRealtimeApiModule) ||
      [];

    expect(imports).toEqual([RtcAdminApiModule]);
  });
});
