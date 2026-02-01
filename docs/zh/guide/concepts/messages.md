# 消息系统

## 消息模型

```typescript
interface Message {
  id: string;           // 消息唯一标识
  type: MessageType;    // 消息类型
  content: any;         // 消息内容
  from: string;         // 发送者 ID
  to: string;           // 接收者 ID
  timestamp: number;    // 发送时间戳
  status: MessageStatus; // 消息状态
}

type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
```

## 消息类型

- **text** - 文本消息
- **image** - 图片消息
- **audio** - 语音消息
- **video** - 视频消息
- **file** - 文件消息

## 消息状态

- **sending** - 发送中
- **sent** - 已发送
- **delivered** - 已送达
- **read** - 已读
