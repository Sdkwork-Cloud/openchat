# Contact Management API

Contact Management API provides functionality for adding, querying, updating, and deleting contacts.

## Overview

All Contact Management APIs require JWT authentication. Path prefix: `/im/api/v1/contacts`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Add Contact | POST | `/contacts` | Add a new contact |
| Get Contact List | GET | `/contacts/user/:userId` | Get user's contact list |
| Get Contact Details | GET | `/contacts/:id` | Get contact details |
| Update Contact | PUT | `/contacts/:id` | Update contact info |
| Delete Contact | DELETE | `/contacts/:id` | Delete a contact |
| Check Contact | GET | `/contacts/check` | Check if user is a contact |
| Search Contacts | GET | `/contacts/search` | Search contacts |
| Import Contacts | POST | `/contacts/import` | Batch import contacts |
| Set Contact Remark | PUT | `/contacts/:id/remark` | Set contact remark |
| Set Contact Group | PUT | `/contacts/:id/group` | Set contact group |

---

## Add Contact

Add a new contact.

```http
POST /im/api/v1/contacts
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "userId": "user-001",
  "contactId": "user-002",
  "remark": "John - Colleague",
  "group": "Colleagues",
  "description": "Tech team colleague"
}
```

### Response

```json
{
  "id": "contact-uuid",
  "userId": "user-001",
  "contactId": "user-002",
  "remark": "John - Colleague",
  "group": "Colleagues",
  "contactInfo": {
    "id": "user-002",
    "username": "john",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Get Contact List

Get all contacts for a user.

```http
GET /im/api/v1/contacts/user/:userId?group=Colleagues&search=john&limit=50&offset=0
Authorization: Bearer <access-token>
```

### Response

```json
[
  {
    "id": "contact-001",
    "userId": "user-001",
    "contactId": "user-002",
    "remark": "John - Colleague",
    "group": "Colleagues",
    "contactInfo": {
      "id": "user-002",
      "nickname": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "isOnline": true
    },
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

---

## SDK Usage

### TypeScript SDK

```typescript
import { OpenChatClient, DeviceFlag } from '@openchat/sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// Get contact list
const contacts = await client.im.contacts.getContacts({
  userId: 'user-001',
  type: 'user',
  status: 'active',
  limit: 20
});

// Create contact
const contact = await client.im.contacts.createContact({
  userId: 'user-001',
  contactId: 'user-002',
  type: 'user',
  name: 'John Doe',
  remark: 'Colleague',
  tags: ['work', 'tech']
});

// Delete contact
await client.im.contacts.deleteContact('contact-id');
```

---

## Related Links

- [Friend Management API](./friends.md)
- [User Management API](./users.md)
- [Conversation Management API](./conversations.md)
