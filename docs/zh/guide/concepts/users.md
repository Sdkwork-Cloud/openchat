# 用户系统

## 用户模型

```typescript
interface User {
  id: string;           // 用户唯一标识
  username: string;     // 用户名
  nickname: string;     // 昵称
  avatar?: string;      // 头像 URL
  status: UserStatus;   // 在线状态
  createdAt: Date;      // 创建时间
}

type UserStatus = 'online' | 'offline' | 'busy' | 'away';
```

## 用户状态

- **online** - 在线
- **offline** - 离线
- **busy** - 忙碌
- **away** - 离开

## 用户关系

- **好友** - 双向关注关系
- **陌生人** - 无关系
- **黑名单** - 屏蔽关系
