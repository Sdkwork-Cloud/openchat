# 群组系统

## 群组模型

```typescript
interface Group {
  id: string;           // 群组唯一标识
  name: string;         // 群组名称
  description?: string; // 群组描述
  avatar?: string;      // 群组头像
  ownerId: string;      // 群主 ID
  memberCount: number;  // 成员数量
  createdAt: Date;      // 创建时间
}
```

## 群组成员角色

- **owner** - 群主
- **admin** - 管理员
- **member** - 普通成员

## 群组类型

- **普通群** - 最多 2000 人
- **大群** - 最多 10000 人
- **直播群** - 无上限，仅管理员发言

## 相关 API

- [群组管理 API](/zh/api/groups.md)
