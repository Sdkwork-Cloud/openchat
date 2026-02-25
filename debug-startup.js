const { NestFactory } = require('@nestjs/core');
const { Module, Logger } = require('@nestjs/common');
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { TypeOrmModule } = require('@nestjs/typeorm');

const logger = new Logger('Debug');

// 只导入最基本的模块
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService) => {
        const config = {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: parseInt(configService.get('DB_PORT', '5432'), 10),
          username: configService.get('DB_USERNAME', 'sdkwork_dev'),
          password: configService.get('DB_PASSWORD', 'dev_password'),
          database: configService.get('DB_NAME', 'sdkwork_chat_dev'),
          entities: [],
          synchronize: false,
          logging: false,
        };
        logger.log('TypeORM Config: ' + JSON.stringify({
          host: config.host,
          port: config.port,
          username: config.username,
          database: config.database,
        }));
        return config;
      },
    }),
  ],
})
class MinimalAppModule {}

async function test() {
  console.log('\n=== Testing Minimal NestJS App ===\n');
  
  try {
    console.log('Creating application...');
    const app = await NestFactory.create(MinimalAppModule, {
      logger: ['log', 'error', 'warn'],
    });
    
    console.log('\n✓ SUCCESS: Application started!');
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await app.close();
    console.log('✓ Application closed');
  } catch (error) {
    console.error('\n✗ FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();
