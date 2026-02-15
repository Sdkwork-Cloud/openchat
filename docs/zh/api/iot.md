
# IoT API

本页面提供 OpenChat IoT 相关的 API 文档，用于管理 IoT 设备和设备消息。

## 接口列表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/iot/devices` | 注册设备 | 是 |
| GET | `/iot/devices` | 获取设备列表 | 否 |
| GET | `/iot/devices/:deviceId` | 获取设备详情 | 否 |
| PUT | `/iot/devices/:deviceId/status` | 更新设备状态 | 是 |
| DELETE | `/iot/devices/:deviceId` | 删除设备 | 是 |
| POST | `/iot/devices/:deviceId/messages` | 发送消息到设备 | 是 |
| GET | `/iot/devices/:deviceId/messages` | 获取设备消息历史 | 否 |
| POST | `/iot/devices/:deviceId/control` | 控制设备 | 是 |

## 数据结构

### DeviceType

设备类型枚举。

| 值 | 说明 |
|----|------|
| `SENSOR` | 传感器 |
| `ACTUATOR` | 执行器 |
| `CAMERA` | 摄像头 |
| `SPEAKER` | 扬声器 |
| `DISPLAY` | 显示器 |
| `GATEWAY` | 网关 |
| `OTHER` | 其他 |

### DeviceStatus

设备状态枚举。

| 值 | 说明 |
|----|------|
| `ONLINE` | 在线 |
| `OFFLINE` | 离线 |
| `BUSY` | 忙碌 |
| `ERROR` | 错误 |

### DeviceMessageType

设备消息类型枚举。

| 值 | 说明 |
|----|------|
| `STATUS` | 状态报告 |
| `DATA` | 数据上报 |
| `COMMAND` | 命令 |
| `RESPONSE` | 响应 |
| `ERROR` | 错误 |

## 接口详情

### 注册设备

注册新的 IoT 设备。

**请求：**

```http
POST /iot/devices
Authorization: Bearer &lt;token&gt;
Content-Type: application/json

{
  "deviceId": "device-001",
  "type": "SENSOR",
  "name": "温度传感器",
  "description": "客厅温度传感器",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:11:22:33:44:55",
  "metadata": {
    "location": "living_room",
    "model": "TS-2024"
  }
}
```

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备唯一标识 |
| type | DeviceType | 是 | 设备类型 |
| name | string | 是 | 设备名称 |
| description | string | 否 | 设备描述 |
| ipAddress | string | 否 | IP 地址 |
| macAddress | string | 否 | MAC 地址 |
| metadata | object | 否 | 自定义元数据 |

**响应示例：**

```json
{
  "id": "uuid",
  "deviceId": "device-001",
  "type": "SENSOR",
  "name": "温度传感器",
  "description": "客厅温度传感器",
  "status": "OFFLINE",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:11:22:33:44:55",
  "metadata": {
    "location": "living_room",
    "model": "TS-2024"
  },
  "userId": "user-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 获取设备列表

获取所有设备或指定用户的设备列表。

**请求：**

```http
GET /iot/devices?userId=user-uuid&amp;page=1&amp;limit=20
```

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 否 | 用户 ID，不填则获取所有设备 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应示例：**

```json
{
  "items": [
    {
      "id": "uuid",
      "deviceId": "device-001",
      "type": "SENSOR",
      "name": "温度传感器",
      "status": "ONLINE",
      "userId": "user-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 获取设备详情

获取指定设备的详细信息。

**请求：**

```http
GET /iot/devices/device-001
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**响应示例：**

```json
{
  "id": "uuid",
  "deviceId": "device-001",
  "type": "SENSOR",
  "name": "温度传感器",
  "description": "客厅温度传感器",
  "status": "ONLINE",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:11:22:33:44:55",
  "metadata": {
    "location": "living_room",
    "model": "TS-2024"
  },
  "userId": "user-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 更新设备状态

更新设备的在线状态。

**请求：**

```http
PUT /iot/devices/device-001/status
Authorization: Bearer &lt;token&gt;
Content-Type: application/json

{
  "status": "ONLINE"
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | DeviceStatus | 是 | 设备状态 |

**响应示例：**

```json
{
  "id": "uuid",
  "deviceId": "device-001",
  "status": "ONLINE",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 删除设备

删除指定设备。

**请求：**

```http
DELETE /iot/devices/device-001
Authorization: Bearer &lt;token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**响应：**

HTTP 204 No Content

---

### 发送消息到设备

向设备发送消息。

**请求：**

```http
POST /iot/devices/device-001/messages
Authorization: Bearer &lt;token&gt;
Content-Type: application/json

{
  "type": "COMMAND",
  "payload": {
    "action": "get_temperature"
  },
  "topic": "sensor/command"
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | DeviceMessageType | 是 | 消息类型 |
| payload | any | 是 | 消息内容 |
| topic | string | 否 | 消息主题 |

**响应示例：**

```json
{
  "id": "uuid",
  "deviceId": "device-001",
  "type": "COMMAND",
  "payload": {
    "action": "get_temperature"
  },
  "topic": "sensor/command",
  "direction": "TO_DEVICE",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 获取设备消息历史

获取设备的消息历史记录。

**请求：**

```http
GET /iot/devices/device-001/messages?limit=100&amp;before=2024-01-01T00:00:00.000Z
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回数量，默认 100 |
| before | string | 否 | 在此时间之前的消息（ISO 8601） |

**响应示例：**

```json
{
  "items": [
    {
      "id": "uuid",
      "deviceId": "device-001",
      "type": "DATA",
      "payload": {
        "temperature": 25.5,
        "humidity": 60
      },
      "direction": "FROM_DEVICE",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 控制设备

向设备发送控制命令。

**请求：**

```http
POST /iot/devices/device-001/control
Authorization: Bearer &lt;token&gt;
Content-Type: application/json

{
  "action": "turn_on",
  "params": {
    "brightness": 80
  }
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | 是 | 控制动作 |
| params | object | 否 | 动作参数 |

**响应示例：**

```json
{
  "success": true,
  "action": "turn_on",
  "result": {
    "status": "on",
    "brightness": 80
  }
}
```

