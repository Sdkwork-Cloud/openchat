# OpenChat 服务器架构规范

## 目录结构规范

所有模块必须遵循统一的分目录架构：

```
src/modules/{module-name}/
├── entities/           # 数据库实体（TypeORM）
│   └── *.entity.ts
├── services/           # 业务逻辑服务
│   └── *.service.ts
├── controllers/        # API 控制器
│   └── *.controller.ts
├── dto/               # 数据传输对象（可选）
│   └── *.dto.ts
├── guards/            # 守卫（可选）
│   └── *.guard.ts
├── interfaces/        # 接口定义（可选）
│   └── *.interface.ts
├── {module-name}.module.ts  # 模块定义
└── index.ts           # 模块导出
```

## 模块示例

### 1. 用户模块 (user)

```
src/modules/user/
├── entities/
│   └── user.entity.ts
├── services/
│   ├── user.service.ts
│   ├── auth.service.ts
│   └── user-sync.service.ts
├── controllers/
│   ├── user.controller.ts
│   └── auth.controller.ts
├── dto/
│   └── auth.dto.ts
├── guards/
│   └── jwt-auth.guard.ts
├── user.module.ts
└── index.ts
```

### 2. Bot 平台模块 (bot-platform)

```
src/modules/bot-platform/
├── entities/
│   ├── bot.entity.ts
│   └── bot-command.entity.ts
├── services/
│   ├── bot.service.ts
│   └── webhook.service.ts
├── controllers/
│   └── bot.controller.ts
├── bot-platform.module.ts
└── index.ts
```

## 编码规范

### 1. 实体规范

```typescript
// entities/user.entity.ts
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('table_name')  // 使用小写下划线命名
@Index(['field'], { unique: true })  // 添加必要索引
export class UserEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: '字段说明',  // 必须添加注释
  })
  username: string;

  // 敏感字段使用 select: false
  @Column({ select: false })
  password: string;
}
```

### 2. 服务规范

```typescript
// services/user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {}

  // 方法必须有返回类型
  async getUserById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
```

### 3. 控制器规范

```typescript
// controllers/user.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MultiAuthGuard, RequireScopes } from '../../../common/auth/guards/multi-auth.guard';

@ApiTags('users')  // Swagger 标签
@Controller('api/v1/users')  // RESTful 路径
@UseGuards(MultiAuthGuard)   // 使用多方式认证
@ApiBearerAuth()             // Swagger 认证
export class UserController {
  @Get()
  @RequireScopes('users:read')  // 权限范围
  @ApiOperation({ summary: '获取用户列表' })
  async getUsers() {
    // ...
  }
}
```

### 4. 模块规范

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

## 认证体系

### 支持的认证方式

1. **JWT** - 用户认证
   - Header: `Authorization: Bearer <jwt-token>`
   - Query: `?token=<jwt-token>`
   - Cookie: `token=<jwt-token>`

2. **Bot Token** - Bot 认证
   - Header: `Authorization: Bearer <bot-token>`
   - Header: `X-Bot-Token: <bot-token>`
   - Query: `?bot_token=<bot-token>`

3. **API Key** - 服务器间认证
   - Header: `X-API-Key: <api-key>`
   - Query: `?api_key=<api-key>`

### Token 格式

```
# JWT
 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Bot Token
 oc_bot_<appId>_<random>
 示例: oc_bot_a1b2c3d4..._x9y8z7w6...

# API Key
 oc_api_<keyId>_<random>
 示例: oc_api_a1b2c3d4..._x9y8z7w6...
```

### 配置方式

```yaml
# .env
AUTH_ENABLED_STRATEGIES=jwt,bot-token,api-key
AUTH_DEFAULT_STRATEGY=jwt
AUTH_ALLOW_ANONYMOUS=false
```

## API 设计规范

### RESTful 路径

```
/api/v1/{resource}/{id}/{action}

示例:
/api/v1/users              # 用户列表
/api/v1/users/:id          # 用户详情
/api/v1/users/:id/profile  # 用户资料
/api/v1/bots               # Bot 列表
/api/v1/bots/:id/webhook   # Bot Webhook
```

### HTTP 方法

| 方法 | 用途 |
|------|------|
| GET | 获取资源 |
| POST | 创建资源 |
| PUT | 更新资源（完整） |
| PATCH | 更新资源（部分） |
| DELETE | 删除资源 |

### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": { ... }
  }
}
```

## 数据库规范

### 命名规范

- 表名: `snake_case`，复数形式
  - `chat_users`
  - `chat_messages`
  - `platform_bots`

- 字段名: `snake_case`
  - `created_at`
  - `updated_at`

- 索引名: `idx_{table}_{field}`
  - `idx_chat_users_username`

### 字段规范

```typescript
// 必须字段
@Column({ type: 'uuid', primary: true })
id: string;

@Column({ type: 'uuid' })
uuid: string;

@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
createdAt: Date;

@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
updatedAt: Date;

// 软删除
@Column({ type: 'boolean', default: false })
isDeleted: boolean;

@Column({ type: 'timestamp', nullable: true })
deletedAt: Date;
```

## 错误处理规范

### HTTP 状态码

| 状态码 | 用途 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 无内容（删除成功） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

### 异常类

```typescript
// 业务异常
throw new BadRequestException('Invalid parameters');
throw new UnauthorizedException('Authentication required');
throw new ForbiddenException('Permission denied');
throw new NotFoundException('User not found');
throw new ConflictException('Username already exists');
```

## 日志规范

### 日志级别

```typescript
// DEBUG - 调试信息
this.logger.debug('Processing message', messageId);

// LOG - 一般信息
this.logger.log('User created', userId);

// WARN - 警告
this.logger.warn('Rate limit approaching', userId);

// ERROR - 错误
this.logger.error('Failed to send message', error.stack);
```

### 日志内容

- 必须包含上下文信息
- 敏感信息必须脱敏
- 使用结构化日志

## 测试规范

### 单元测试

```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should get user by id', async () => {
    const user = await service.getUserById('test-id');
    expect(user).toBeDefined();
  });
});
```

## 文档规范

### Swagger 注解

```typescript
@ApiTags('users')                    // 分组
@ApiOperation({ summary: '...' })    // 操作说明
@ApiResponse({ status: 200, ... })   // 响应说明
@ApiBearerAuth()                     // 需要认证
@ApiParam({ name: 'id', ... })       // 路径参数
@ApiQuery({ name: 'keyword', ... })  // 查询参数
@ApiBody({ type: CreateUserDto })    // 请求体
```

## 性能优化

### 数据库优化

- 添加必要索引
- 使用查询缓存
- 批量操作
- 分页查询

### 缓存策略

- L1: 本地内存（60s）
- L2: Redis（5min）
- L3: 数据库

### 异步处理

- 使用消息队列
- 事件驱动架构
- 非阻塞 I/O

## 安全规范

### 认证安全

- Token 使用 bcrypt 哈希存储
- Webhook 使用 HMAC-SHA256 签名
- HTTPS 强制
- 时间戳防重放

### 数据安全

- 密码使用 bcrypt 加密
- 敏感字段使用 select: false
- SQL 注入防护（参数化查询）
- XSS 防护

### 访问控制

- 基于 Scope 的权限控制
- 资源级权限检查
- 速率限制

## 部署规范

### 环境变量

```bash
# 数据库
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# JWT
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1h

# 认证
AUTH_ENABLED_STRATEGIES=jwt,bot-token,api-key
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

*文档版本: 1.0*  
*最后更新: 2026-02-01*
