import { Module, Global } from '@nestjs/common';
import { ConfigValidationService } from './config.validation';

@Global()
@Module({
  providers: [ConfigValidationService],
  exports: [ConfigValidationService],
})
export class AppConfigModule {}
