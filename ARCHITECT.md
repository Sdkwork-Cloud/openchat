# OpenChat 架构标准文档

## 1. 架构概述

OpenChat 是一个基于 NestJS 11.x 和 TypeScript 的实时通信服务器，提供以下核心功能：

- 实时消息传递（WebSocket）
- RESTful API 接口
- 多认证系统（JWT、Bot Token、API Key）
- 分布式 WebSocket 支持
- 消息确认和重试机制
- 速率限制和队列处理

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       客户端                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  API 网关/负载均衡                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    NestJS 应用服务器集群                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  应用实例 1   │  │  应用实例 2   │  │  应用实例 N   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────┐  ┌─────────────────────┐
│           Redis 集群              │  │    PostgreSQL      │
│  - WebSocket 适配器               │  │    主数据库         │
│  - 缓存                           │  └─────────────────────┘
│  - 分布式状态                     │
└───────────────────────────────────┘
```

## 2. 技术栈

| 类别 | 技术/库 | 版本 | 用途 |
|------|---------|------|------|
| 核心框架 | NestJS | 11.x | 应用服务器框架 |
| 语言 | TypeScript | 5.9.x | 开发语言 |
| 数据库 | PostgreSQL | 15+ | 主数据库 |
| ORM | TypeORM | 0.3.x | 数据库对象关系映射 |
| 缓存/分布式 | Redis | 7+ | 缓存、WebSocket 适配器、分布式状态 |
| WebSocket | Socket.IO | 4.x | 实时通信 |
| 认证 | JWT | - | 用户认证 |
| 队列 | BullMQ | - | 消息队列 |
| 速率限制 | Throttler | - | API 速率限制 |
| 压缩 | Compression | - | HTTP 响应压缩 |
| 配置 | ConfigModule | - | 环境变量管理 |

## 3. 目录结构

```
src/
├── common/              # 公共模块
│   ├── auth/            # 认证相关
│   ├── redis/           # Redis 配置
│   ├── config/          # 配置管理
│   └── utils/           # 工具函数
├── modules/             # 业务模块
│   ├── user/            # 用户模块
│   ├── bot-platform/    # 机器人平台
│   ├── rtc/             # 实时通信
│   └── ...              # 其他业务模块
├── gateways/            # WebSocket 网关
├── controllers/         # HTTP 控制器
├── services/            # 服务层
├── entities/            # 数据库实体
├── dto/                 # 数据传输对象
├── main.ts              # 应用入口
└── app.module.ts        # 应用主模块
```

### 3.1 模块组织原则

1. **功能模块化**：每个模块负责一个特定的业务领域
2. **单一职责**：每个文件和类只负责一个功能
3. **依赖注入**：使用 NestJS 的依赖注入系统
4. **循环依赖避免**：通过模块重新组织和依赖倒置解决

## 4. 代码结构和命名约定

### 4.1 命名约定

| 项目 | 约定 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService` |
| 方法名 | camelCase | `getUserById()` |
| 变量名 | camelCase | `userId` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件/目录名 | kebab-case | `user-service.ts` |
| 模块名 | PascalCase | `UserModule` |
| 装饰器 | PascalCase | `@Injectable()` |

### 4.2 代码结构

```typescript
// 模块定义
@Module({
  imports: [/* 依赖模块 */],
  controllers: [/* 控制器 */],
  providers: [/* 服务 */],
  exports: [/* 导出项 */],
})
export class ExampleModule {}

// 控制器
@Controller('example')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  getExamples() {
    return this.exampleService.getExamples();
  }
}

// 服务
@Injectable()
export class ExampleService {
  getExamples() {
    // 业务逻辑
  }
}

// 实体
@Entity()
export class ExampleEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;
}
```

## 5. 数据库设计

### 5.1 数据库配置

```typescript
// 数据库配置示例
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsRun: true,
}
```

### 5.2 实体设计原则

1. **主键类型**：使用 `bigint` 类型的自增主键或 Snowflake ID
2. **列类型**：根据数据类型选择合适的列类型
3. **关系映射**：使用 TypeORM 的关系装饰器定义实体关系
4. **索引**：为常用查询字段添加索引
5. **软删除**：使用 `@DeleteDateColumn()` 实现软删除

### 5.3 实体示例

```typescript
@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
```

## 6. API 设计

### 6.1 RESTful API 原则

1. **资源命名**：使用复数名词表示资源
2. **HTTP 方法**：使用适当的 HTTP 方法
   - GET：获取资源
   - POST：创建资源
   - PUT：更新资源
   - DELETE：删除资源
3. **状态码**：使用标准 HTTP 状态码
4. **版本控制**：在 URL 中包含 API 版本
5. **响应格式**：统一的 JSON 响应格式

### 6.2 API 路由结构

```
/api/v1/users          # 用户相关 API
/api/v1/messages       # 消息相关 API
/api/v1/bots           # 机器人相关 API
/api/v1/rtc            # 实时通信相关 API
```

### 6.3 响应格式

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { /* 响应数据 */ }
}
```

## 7. 认证系统

### 7.1 认证类型

1. **JWT 认证**：用于用户认证
2. **Bot Token 认证**：用于机器人
3. **API Key 认证**：用于第三方集成

### 7.2 JWT 配置

```typescript
// JWT 配置示例
{
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: '24h',
  },
}
```

### 7.3 认证模块结构

```typescript
// 认证模块示例
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
    TypeOrmModule.forFeature([UserEntity, BotEntity]),
  ],
  providers: [AuthService, JwtStrategy, BotStrategy, ApiKeyStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

## 8. WebSocket 实现

### 8.1 WebSocket 架构

1. **Socket.IO**：使用 Socket.IO 实现 WebSocket 通信
2. **Redis 适配器**：使用 Redis 适配器实现分布式 WebSocket
3. **消息确认**：实现消息确认和重试机制
4. **房间管理**：支持基于房间的消息广播

### 8.2 WebSocket 网关示例

```typescript
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WsGateway {
  constructor(
    @Inject(WsAdapter) private adapter: RedisAdapter,
    private readonly messageService: MessageService,
  ) {}

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): Observable<any> {
    // 处理消息逻辑
    return of({ event: 'message', data: payload });
  }
}
```

### 8.3 消息确认机制

1. **消息 ID**：为每个消息生成唯一 ID
2. **确认超时**：设置消息确认超时
3. **重试机制**：实现消息重试逻辑
4. **状态管理**：维护消息发送状态

## 9. 配置管理

### 9.1 环境变量

| 环境变量 | 描述 | 默认值 |
|---------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务器端口 | 3000 |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名称 | openchat |
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| REDIS_PASSWORD | Redis 密码 | - |
| JWT_SECRET | JWT 密钥 | - |

### 9.2 配置模块

```typescript
// 配置模块示例
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
    }),
  ],
})
export class AppModule {}
```

## 10. 部署和扩展

### 10.1 部署架构

1. **容器化**：使用 Docker 容器化应用
2. **编排**：使用 Kubernetes 进行容器编排
3. **负载均衡**：使用 Nginx 或云服务负载均衡
4. **数据库**：使用托管 PostgreSQL 服务
5. **缓存**：使用托管 Redis 服务

### 10.2 扩展策略

1. **水平扩展**：通过增加应用实例数量扩展
2. **Redis 集群**：使用 Redis 集群提高缓存性能
3. **数据库读写分离**：实现数据库读写分离
4. **消息队列**：使用 BullMQ 处理异步任务

## 11. 最佳实践

### 11.1 代码质量

1. **TypeScript**：充分利用 TypeScript 类型系统
2. **ESLint**：使用 ESLint 检查代码质量
3. **Prettier**：使用 Prettier 格式化代码
4. **测试**：编写单元测试和集成测试

### 11.2 安全性

1. **密码哈希**：使用 bcrypt 等算法哈希密码
2. **HTTPS**：使用 HTTPS 保护通信
3. **CORS**：正确配置 CORS
4. **速率限制**：实现 API 速率限制
5. **输入验证**：验证所有用户输入

### 11.3 性能

1. **缓存**：合理使用 Redis 缓存
2. **数据库索引**：为常用查询添加索引
3. **批量操作**：使用批量操作减少数据库查询
4. **异步处理**：使用异步处理提高性能

### 11.4 可维护性

1. **文档**：为代码和 API 编写文档
2. **注释**：添加必要的代码注释
3. **模块化**：保持代码模块化
4. **错误处理**：统一的错误处理机制

## 12. 项目初始化模板

### 12.1 初始化步骤

1. **创建项目**：使用 NestJS CLI 创建项目
   ```bash
   nest new project-name
   ```

2. **安装依赖**：
   ```bash
   npm install @nestjs/typeorm typeorm pg ioredis socket.io @nestjs/platform-socket.io @nestjs/jwt @nestjs/config bcrypt compression @nestjs/throttler bullmq
   ```

3. **配置环境变量**：创建 `.env` 文件

4. **创建目录结构**：按照标准目录结构组织代码

5. **实现核心模块**：实现认证、数据库、WebSocket 等核心模块

### 12.2 项目模板文件

- **package.json**：项目配置和依赖
- **tsconfig.json**：TypeScript 配置
- **.env.example**：环境变量示例
- **docker-compose.yml**：Docker 配置
- **README.md**：项目说明

## 13. 总结

OpenChat 架构标准文档提供了一个完整的参考，用于构建基于 NestJS 的实时通信服务器。该架构具有以下特点：

- **模块化**：清晰的模块划分和职责分离
- **可扩展**：支持水平扩展和分布式部署
- **安全**：多种认证方式和安全措施
- **高性能**：缓存、异步处理和优化
- **可维护**：标准化的代码结构和最佳实践

通过遵循这些标准，可以快速构建和部署类似的实时通信应用，同时确保代码质量和系统可靠性。