# 联系人管理 API

联系人管理 API 提供联系人的添加、查询、更新、删除等功能。

## 概述

所有联系人管理 API 都需要 JWT 认证，路径前缀为 `/api/v1/contacts`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 添加联系人 | POST | `/contacts` | 添加新联系人 |
| 获取联系人列表 | GET | `/contacts/user/:userId` | 获取用户的联系人列表 |
| 获取联系人详情 | GET | `/contacts/:id` | 获取联系人详细信息 |
| 更新联系人 | PUT | `/contacts/:id` | 更新联系人信息 |
| 删除联系人 | DELETE | `/contacts/:id` | 删除联系人 |
| 检查是否为联系人 | GET | `/contacts/check` | 检查用户是否为联系人 |
| 搜索联系人 | GET | `/contacts/search` | 搜索联系人 |
| 批量导入联系人 | POST | `/contacts/import` | 批量导入联系人 |
| 设置联系人备注 | PUT | `/contacts/:id/remark` | 设置联系人备注 |
| 设置联系人分组 | PUT | `/contacts/:id/group` | 设置联系人分组 |

---

## 添加联系人

添加一个新联系人。

```http
POST /api/v1/contacts
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "userId": "user-001",
  "contactId": "user-002",
  "remark": "张三-同事",
  "group": "同事",
  "description": "技术部同事"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| contactId | string | 是 | 联系人ID |
| remark | string | 否 | 联系人备注名 |
| group | string | 否 | 联系人分组 |
| description | string | 否 | 联系人描述 |

### 响应示例

```json
{
  "id": "contact-uuid",
  "userId": "user-001",
  "contactId": "user-002",
  "remark": "张三-同事",
  "group": "同事",
  "description": "技术部同事",
  "contactInfo": {
    "id": "user-002",
    "username": "zhangsan",
    "nickname": "张三",
    "avatar": "https://example.com/avatar.jpg"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 400: 联系人已存在

---

## 获取联系人列表

获取用户的所有联系人列表。

```http
GET /api/v1/contacts/user/:userId?group=同事&search=张&limit=50&offset=0
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| group | string | 否 | - | 按分组筛选 |
| search | string | 否 | - | 搜索关键词 |
| limit | number | 否 | 50 | 返回数量限制 |
| offset | number | 否 | 0 | 偏移量 |

### 响应示例

```json
[
  {
    "id": "contact-001",
    "userId": "user-001",
    "contactId": "user-002",
    "remark": "张三-同事",
    "group": "同事",
    "description": "技术部同事",
    "contactInfo": {
      "id": "user-002",
      "username": "zhangsan",
      "nickname": "张三",
      "avatar": "https://example.com/avatar1.jpg",
      "isOnline": true
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "contact-002",
    "userId": "user-001",
    "contactId": "user-003",
    "remark": "李四-朋友",
    "group": "朋友",
    "contactInfo": {
      "id": "user-003",
      "username": "lisi",
      "nickname": "李四",
      "avatar": "https://example.com/avatar2.jpg",
      "isOnline": false
    },
    "createdAt": "2024-01-14T10:00:00Z",
    "updatedAt": "2024-01-14T10:00:00Z"
  }
]
```

---

## 获取联系人详情

根据联系人ID获取详细信息。

```http
GET /api/v1/contacts/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 联系人记录ID |

### 响应示例

```json
{
  "id": "contact-uuid",
  "userId": "user-001",
  "contactId": "user-002",
  "remark": "张三-同事",
  "group": "同事",
  "description": "技术部同事",
  "contactInfo": {
    "id": "user-002",
    "username": "zhangsan",
    "nickname": "张三",
    "avatar": "https://example.com/avatar.jpg",
    "email": "zhangsan@example.com",
    "phone": "+8613800138000",
    "signature": "热爱编程",
    "isOnline": true,
    "lastActiveAt": "2024-01-15T10:30:00Z"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### 错误响应

- 404: 联系人不存在

---

## 更新联系人

更新联系人信息。

```http
PUT /api/v1/contacts/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 联系人记录ID |

### 请求体

```json
{
  "remark": "张三-技术总监",
  "group": "领导",
  "description": "技术部总监"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| remark | string | 否 | 联系人备注名 |
| group | string | 否 | 联系人分组 |
| description | string | 否 | 联系人描述 |

### 响应示例

```json
{
  "id": "contact-uuid",
  "remark": "张三-技术总监",
  "group": "领导",
  "description": "技术部总监",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 联系人不存在

---

## 删除联系人

删除指定联系人。

```http
DELETE /api/v1/contacts/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 联系人记录ID |

### 响应示例

```json
true
```

### 错误响应

- 404: 联系人不存在

---

## 检查是否为联系人

检查指定用户是否为当前用户的联系人。

```http
GET /api/v1/contacts/check?userId=user-001&contactId=user-002
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| contactId | string | 是 | 联系人ID |

### 响应示例

```json
{
  "isContact": true,
  "contact": {
    "id": "contact-uuid",
    "remark": "张三-同事",
    "group": "同事"
  }
}
```

---

## 搜索联系人

搜索用户的联系人。

```http
GET /api/v1/contacts/search?userId=user-001&keyword=张
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| keyword | string | 是 | 搜索关键词 |

### 响应示例

```json
[
  {
    "id": "contact-001",
    "contactId": "user-002",
    "remark": "张三-同事",
    "contactInfo": {
      "nickname": "张三",
      "avatar": "https://example.com/avatar.jpg"
    }
  },
  {
    "id": "contact-002",
    "contactId": "user-004",
    "remark": "张伟-朋友",
    "contactInfo": {
      "nickname": "张伟",
      "avatar": "https://example.com/avatar2.jpg"
    }
  }
]
```

---

## 批量导入联系人

批量导入多个联系人。

```http
POST /api/v1/contacts/import
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "userId": "user-001",
  "contacts": [
    {
      "contactId": "user-002",
      "remark": "张三",
      "group": "同事"
    },
    {
      "contactId": "user-003",
      "remark": "李四",
      "group": "朋友"
    }
  ]
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| contacts | array | 是 | 联系人列表 |

### 响应示例

```json
{
  "success": true,
  "imported": 2,
  "skipped": 0,
  "contacts": [
    {
      "id": "contact-001",
      "contactId": "user-002",
      "remark": "张三"
    },
    {
      "id": "contact-002",
      "contactId": "user-003",
      "remark": "李四"
    }
  ]
}
```

---

## 设置联系人备注

设置联系人的备注名。

```http
PUT /api/v1/contacts/:id/remark
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 联系人记录ID |

### 请求体

```json
{
  "remark": "张三-技术总监"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| remark | string | 是 | 备注名 |

### 响应示例

```json
{
  "id": "contact-uuid",
  "remark": "张三-技术总监",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 联系人不存在

---

## 设置联系人分组

设置联系人的分组。

```http
PUT /api/v1/contacts/:id/group
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 联系人记录ID |

### 请求体

```json
{
  "group": "重要客户"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group | string | 是 | 分组名称 |

### 响应示例

```json
{
  "id": "contact-uuid",
  "group": "重要客户",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 联系人不存在

---

## 数据类型

```typescript
interface Contact {
  id: string;                    // 联系人记录ID
  userId: string;                // 用户ID
  contactId: string;             // 联系人ID
  remark?: string;               // 备注名
  group?: string;                // 分组
  description?: string;          // 描述
  contactInfo?: UserInfo;        // 联系人信息
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}

interface CreateContactRequest {
  userId: string;                // 用户ID
  contactId: string;             // 联系人ID
  remark?: string;               // 备注名
  group?: string;                // 分组
  description?: string;          // 描述
}

interface UpdateContactRequest {
  remark?: string;               // 备注名
  group?: string;                // 分组
  description?: string;          // 描述
}
```

---

## 相关链接

- [好友管理 API](./friends.md)
- [用户管理 API](./users.md)
- [会话管理 API](./conversations.md)
