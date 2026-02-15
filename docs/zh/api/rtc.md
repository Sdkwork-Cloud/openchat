# 实时音视频 API

实时音视频 API 提供音视频通话的发起、接听、挂断、信令交换等功能。

## 概述

所有实时音视频 API 都需要 JWT 认证，路径前缀为 `/api/v1/rtc`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发起通话 | POST | `/rtc/call` | 发起音视频通话 |
| 接听通话 | POST | `/rtc/answer` | 接听通话 |
| 拒绝通话 | POST | `/rtc/reject` | 拒绝通话 |
| 挂断通话 | POST | `/rtc/hangup` | 挂断通话 |
| 取消通话 | POST | `/rtc/cancel` | 取消通话 |
| 发送信令 | POST | `/rtc/signal` | 发送WebRTC信令 |
| 获取通话记录 | GET | `/rtc/calls/:userId` | 获取通话记录列表 |
| 获取通话详情 | GET | `/rtc/call/:id` | 获取通话详情 |
| 获取正在进行通话 | GET | `/rtc/active/:userId` | 获取正在进行的通话 |
| 邀请加入通话 | POST | `/rtc/invite` | 邀请用户加入通话 |
| 加入通话 | POST | `/rtc/join` | 加入现有通话 |
| 离开通话 | POST | `/rtc/leave` | 离开通话 |
| 切换媒体设备 | PUT | `/rtc/device` | 切换音视频设备 |
| 切换静音状态 | PUT | `/rtc/mute` | 切换静音状态 |
| 切换视频状态 | PUT | `/rtc/video` | 切换视频开关 |
| 获取通话统计 | GET | `/rtc/stats/:callId` | 获取通话质量统计 |

---

## 发起通话

发起一个新的音视频通话。

```http
POST /api/v1/rtc/call
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callerId": "user-001",
  "calleeIds": ["user-002", "user-003"],
  "type": "video",
  "groupId": "group-001",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1..."
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callerId | string | 是 | 发起者ID |
| calleeIds | string[] | 是 | 接收者ID列表 |
| type | string | 是 | 通话类型：audio=语音，video=视频 |
| groupId | string | 否 | 群组ID（群聊通话时使用） |
| offer | object | 否 | WebRTC Offer SDP |

### 响应示例

```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "callerId": "user-001",
    "calleeIds": ["user-002", "user-003"],
    "type": "video",
    "status": "calling",
    "groupId": "group-001",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 接听通话

接听一个来电。

```http
POST /api/v1/rtc/answer
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-002",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1..."
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 接听者ID |
| answer | object | 是 | WebRTC Answer SDP |

### 响应示例

```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "status": "connected",
    "connectedAt": "2024-01-15T10:30:05Z"
  }
}
```

---

## 拒绝通话

拒绝一个来电。

```http
POST /api/v1/rtc/reject
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-002",
  "reason": "busy"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 拒绝者ID |
| reason | string | 否 | 拒绝原因：busy=忙碌, declined=拒绝 |

### 响应示例

```json
{
  "success": true
}
```

---

## 挂断通话

挂断当前通话。

```http
POST /api/v1/rtc/hangup
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-001"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 挂断者ID |

### 响应示例

```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "status": "ended",
    "endedAt": "2024-01-15T10:45:00Z",
    "duration": 900
  }
}
```

---

## 取消通话

取消一个正在呼叫中的通话。

```http
POST /api/v1/rtc/cancel
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-001"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 取消者ID |

### 响应示例

```json
{
  "success": true
}
```

---

## 发送信令

发送WebRTC信令数据（ICE Candidate等）。

```http
POST /api/v1/rtc/signal
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "fromUserId": "user-001",
  "toUserId": "user-002",
  "signal": {
    "type": "candidate",
    "candidate": {
      "candidate": "candidate:1 1 UDP 2122260223 192.168.1.1 54321 typ host",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    }
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| fromUserId | string | 是 | 发送者ID |
| toUserId | string | 是 | 接收者ID |
| signal | object | 是 | 信令数据 |

### 响应示例

```json
{
  "success": true
}
```

---

## 获取通话记录

获取用户的通话记录列表。

```http
GET /api/v1/rtc/calls/:userId?type=video&status=ended&limit=20&offset=0
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 通话类型筛选：audio, video |
| status | string | 否 | 状态筛选：ended, missed |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |
| limit | number | 否 | 返回数量限制 |
| offset | number | 否 | 偏移量 |

### 响应示例

```json
[
  {
    "id": "call-001",
    "type": "video",
    "callerId": "user-001",
    "callerName": "张三",
    "callerAvatar": "https://example.com/avatar1.jpg",
    "calleeIds": ["user-002"],
    "status": "ended",
    "duration": 900,
    "createdAt": "2024-01-15T10:30:00Z",
    "endedAt": "2024-01-15T10:45:00Z"
  },
  {
    "id": "call-002",
    "type": "audio",
    "callerId": "user-003",
    "callerName": "李四",
    "callerAvatar": "https://example.com/avatar2.jpg",
    "calleeIds": ["user-001"],
    "status": "missed",
    "duration": 0,
    "createdAt": "2024-01-14T15:00:00Z",
    "endedAt": "2024-01-14T15:00:30Z"
  }
]
```

---

## 获取通话详情

获取指定通话的详细信息。

```http
GET /api/v1/rtc/call/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 通话ID |

### 响应示例

```json
{
  "id": "call-uuid",
  "type": "video",
  "callerId": "user-001",
  "callerName": "张三",
  "callerAvatar": "https://example.com/avatar1.jpg",
  "calleeIds": ["user-002", "user-003"],
  "calleeInfo": [
    {
      "userId": "user-002",
      "userName": "李四",
      "userAvatar": "https://example.com/avatar2.jpg",
      "status": "connected",
      "joinedAt": "2024-01-15T10:30:05Z"
    },
    {
      "userId": "user-003",
      "userName": "王五",
      "userAvatar": "https://example.com/avatar3.jpg",
      "status": "rejected",
      "rejectReason": "busy"
    }
  ],
  "status": "connected",
  "groupId": "group-001",
  "duration": 300,
  "createdAt": "2024-01-15T10:30:00Z",
  "connectedAt": "2024-01-15T10:30:05Z"
}
```

---

## 获取正在进行通话

获取用户正在进行的通话。

```http
GET /api/v1/rtc/active/:userId
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |

### 响应示例

```json
{
  "hasActiveCall": true,
  "call": {
    "id": "call-uuid",
    "type": "video",
    "callerId": "user-001",
    "calleeIds": ["user-002"],
    "status": "connected",
    "duration": 300,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 邀请加入通话

邀请其他用户加入现有通话。

```http
POST /api/v1/rtc/invite
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "inviterId": "user-001",
  "inviteeIds": ["user-004", "user-005"]
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| inviterId | string | 是 | 邀请者ID |
| inviteeIds | string[] | 是 | 被邀请者ID列表 |

### 响应示例

```json
{
  "success": true,
  "invited": ["user-004", "user-005"]
}
```

---

## 加入通话

加入一个现有的通话。

```http
POST /api/v1/rtc/join
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-004",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1..."
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 加入者ID |
| offer | object | 否 | WebRTC Offer SDP |

### 响应示例

```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "participants": ["user-001", "user-002", "user-004"]
  }
}
```

---

## 离开通话

离开当前通话。

```http
POST /api/v1/rtc/leave
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-004"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 离开者ID |

### 响应示例

```json
{
  "success": true
}
```

---

## 切换媒体设备

切换音视频输入/输出设备。

```http
PUT /api/v1/rtc/device
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-001",
  "deviceType": "audioinput",
  "deviceId": "device-uuid"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 用户ID |
| deviceType | string | 是 | 设备类型：audioinput, audiooutput, videoinput |
| deviceId | string | 是 | 设备ID |

### 响应示例

```json
{
  "success": true
}
```

---

## 切换静音状态

切换麦克风静音状态。

```http
PUT /api/v1/rtc/mute
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-001",
  "muted": true
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 用户ID |
| muted | boolean | 是 | 是否静音 |

### 响应示例

```json
{
  "success": true,
  "muted": true
}
```

---

## 切换视频状态

切换摄像头开关状态。

```http
PUT /api/v1/rtc/video
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "callId": "call-uuid",
  "userId": "user-001",
  "enabled": false
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |
| userId | string | 是 | 用户ID |
| enabled | boolean | 是 | 是否启用视频 |

### 响应示例

```json
{
  "success": true,
  "enabled": false
}
```

---

## 获取通话统计

获取通话质量统计数据。

```http
GET /api/v1/rtc/stats/:callId
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callId | string | 是 | 通话ID |

### 响应示例

```json
{
  "callId": "call-uuid",
  "stats": {
    "audio": {
      "bytesSent": 1048576,
      "bytesReceived": 2097152,
      "packetsSent": 1000,
      "packetsReceived": 2000,
      "packetsLost": 5,
      "jitter": 0.02,
      "roundTripTime": 0.05
    },
    "video": {
      "bytesSent": 10485760,
      "bytesReceived": 20971520,
      "packetsSent": 5000,
      "packetsReceived": 10000,
      "packetsLost": 10,
      "frameWidth": 1280,
      "frameHeight": 720,
      "frameRate": 30,
      "bitrate": 2000
    }
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

---

## 通话状态

| 状态 | 说明 |
|------|------|
| calling | 呼叫中 |
| ringing | 响铃中 |
| connected | 已接通 |
| ended | 已结束 |
| missed | 未接来电 |
| rejected | 已拒绝 |
| cancelled | 已取消 |

---

## 数据类型

```typescript
interface RTCCall {
  id: string;                    // 通话ID
  type: 'audio' | 'video';       // 通话类型
  callerId: string;              // 发起者ID
  calleeIds: string[];           // 接收者ID列表
  status: CallStatus;            // 通话状态
  groupId?: string;              // 群组ID
  duration: number;              // 通话时长（秒）
  createdAt: Date;               // 创建时间
  connectedAt?: Date;            // 接通时间
  endedAt?: Date;                // 结束时间
}

interface RTCSignal {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;                  // SDP数据
  candidate?: RTCIceCandidate;   // ICE候选
}

interface RTCCallStats {
  audio: {
    bytesSent: number;
    bytesReceived: number;
    packetsSent: number;
    packetsReceived: number;
    packetsLost: number;
    jitter: number;
    roundTripTime: number;
  };
  video: {
    bytesSent: number;
    bytesReceived: number;
    packetsSent: number;
    packetsReceived: number;
    packetsLost: number;
    frameWidth: number;
    frameHeight: number;
    frameRate: number;
    bitrate: number;
  };
}
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [群组管理 API](./groups.md)
