import { Module } from '@nestjs/common';
import { ImAppAutomationApiModule } from './im-app/im-app-automation-api.module';
import { ImAppIdentityApiModule } from './im-app/im-app-identity-api.module';
import { ImAppIntegrationApiModule } from './im-app/im-app-integration-api.module';
import { ImAppMessagingApiModule } from './im-app/im-app-messaging-api.module';
import { ImAppRealtimeApiModule } from './im-app/im-app-realtime-api.module';
import { ImAppSocialApiModule } from './im-app/im-app-social-api.module';

@Module({
  imports: [
    ImAppIdentityApiModule,
    ImAppMessagingApiModule,
    ImAppRealtimeApiModule,
    ImAppAutomationApiModule,
    ImAppIntegrationApiModule,
    ImAppSocialApiModule,
  ],
})
export class ImAppApiModule {}
