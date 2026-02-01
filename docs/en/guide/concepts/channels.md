# 频道类型

## 频道模型

```typescript
interface Channel {
  id: string;           // 频道 ID
  type: ChannelType;    // 频道类型
  name?: string;        // 频道名称
}

type ChannelType = 1 | 2;
// 1: 个人频道
// 2: 群组频道
```

## 频道类型

| 类型值 | 类型 | 说明 |
|--------|------|------|
| 1 | 个人频道 | 一对一私聊 |
| 2 | 群组频道 | 多人群组聊天 |

## 频道 ID 规范

- 个人频道：使用对方用户 ID
- 群组频道：使用群组 ID
