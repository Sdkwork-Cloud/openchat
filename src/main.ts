import { bootstrap } from './bootstrap';
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

// 启动 OpenChat 服务器
bootstrap().catch((error) => {
  logger.error('❌ Failed to start OpenChat Server:', error);
  process.exit(1);
});
