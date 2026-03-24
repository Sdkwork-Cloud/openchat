import { MODULE_METADATA } from '@nestjs/common/constants';
import { ImAppApiModule } from './im-app-api.module';
import { ImAppAutomationApiModule } from './im-app/im-app-automation-api.module';
import { ImAppIdentityApiModule } from './im-app/im-app-identity-api.module';
import { ImAppIntegrationApiModule } from './im-app/im-app-integration-api.module';
import { ImAppMessagingApiModule } from './im-app/im-app-messaging-api.module';
import { ImAppRealtimeApiModule } from './im-app/im-app-realtime-api.module';
import { ImAppSocialApiModule } from './im-app/im-app-social-api.module';

describe('ImAppApiModule', () => {
  it('should compose the app API surface from dedicated app submodules only', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ImAppApiModule) || [];

    expect(imports).toEqual([
      ImAppIdentityApiModule,
      ImAppMessagingApiModule,
      ImAppRealtimeApiModule,
      ImAppAutomationApiModule,
      ImAppIntegrationApiModule,
      ImAppSocialApiModule,
    ]);
  });
});
