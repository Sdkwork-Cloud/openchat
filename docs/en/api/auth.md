# Authentication API

OpenChat uses JWT (JSON Web Token) for authentication, supporting access tokens and refresh tokens.

## Overview

### Authentication Flow

1. The client sends `POST /im/v3/auth/login` with username and password.
2. The server validates credentials against the database.
3. The server loads user data and permissions.
4. The server returns `accessToken` and `refreshToken`.
5. The client includes `Authorization: Bearer <access-token>` on subsequent requests.
6. The server authenticates the request and returns business data.

### Token Types

| Token Type | Validity | Purpose |
|------------|----------|---------|
| Access Token | 1 hour | API request authentication |
| Refresh Token | 7 days | Refresh Access Token |

---

## JWT Payload Structure

The Access Token payload structure is as follows:

```json
{
  "iat": 1708123456,
  "exp": 1708127056,
  "iss": "openchat",
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "username": "johndoe",
  "roles": ["user", "admin"],
  "permissions": ["message:send", "message:read", "*"],
  "tenantId": null,
  "organizationId": null
}
```

**Field Description:**

| Field | Type | Description |
|-------|------|-------------|
| iat | number | Issued at timestamp |
| exp | number | Expiration timestamp |
| iss | string | Issuer (default: openchat) |
| jti | string | JWT unique identifier |
| userId | string | User ID |
| username | string | Username |
| roles | string[] | Role list |
| permissions | string[] | Permission list |
| tenantId | string | Tenant ID (multi-tenant support) |
| organizationId | string | Organization ID (multi-tenant support) |

---

## API Endpoints

### User Registration

Register a new user account.

```http
POST /im/v3/auth/register
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "string",    // Required, 4-20 characters, alphanumeric and underscore
  "password": "string",    // Required, 6-32 characters
  "nickname": "string",    // Optional, display name
  "email": "string",       // Optional, email address
  "phone": "string"        // Optional, phone number
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Registration successful"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Parameter validation failed |
| 409 | `USER_ALREADY_EXISTS` | Username already exists |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

---

### User Login

Login with username and password to get access token.

```http
POST /im/v3/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "string",    // Required
  "password": "string",    // Required
  "deviceId": "string"     // Optional, recommended for device-bound sessions
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "nickname": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "email": "john@example.com"
    }
  },
  "message": "Login successful"
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Parameter validation failed |
| 401 | `INVALID_CREDENTIALS` | Invalid username or password |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

---

### Refresh Token

Use refresh token to get a new access token.

```http
POST /im/v3/auth/refresh
Content-Type: application/json
```

**Request Body:**

```json
{
  "refreshToken": "string"    // Required
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  },
  "message": "Token refreshed successfully"
}
```

---

### User Logout

Logout and invalidate the current session.

```http
POST /im/v3/auth/logout
Authorization: Bearer <access-token>
```

**Response Example:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Device Session Management (Recommended)

Use these endpoints for multi-device governance (WeChat/Telegram-style session control).

#### Device Binding Rules

- If the JWT is not bound with `deviceId`, do not send `deviceId` in device-level operations.
- If the JWT is bound with `deviceId`, request `deviceId` (if provided) must match the JWT claim.
- Device ID format: `[A-Za-z0-9._:-]{1,64}`.

#### 1) List device sessions

```http
GET /im/v3/auth/devices?limit=100
Authorization: Bearer <access-token>
```

Response example:

```json
{
  "total": 2,
  "items": [
    {
      "deviceId": "ios-001",
      "tokenCount": 2,
      "conversationCount": 16,
      "lastActiveAt": "2026-03-08T10:00:00.000Z",
      "isCurrentDevice": true
    },
    {
      "deviceId": "web-001",
      "tokenCount": 1,
      "conversationCount": 4,
      "lastActiveAt": "2026-03-08T09:00:00.000Z",
      "isCurrentDevice": false
    }
  ]
}
```

#### 2) Logout current device

```http
POST /im/v3/auth/logout/device
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request body (optional):

```json
{
  "token": "<access-token>",
  "refreshToken": "<refresh-token>",
  "deviceId": "ios-001"
}
```

Response example:

```json
{
  "success": true,
  "deviceId": "ios-001",
  "revokedTokens": 2,
  "clearedCursors": 8
}
```

#### 3) Logout a specific device

```http
POST /im/v3/auth/logout/device/{deviceId}
Authorization: Bearer <access-token>
```

#### 4) Logout other devices (keep current)

```http
POST /im/v3/auth/logout/others
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request body (optional):

```json
{
  "deviceId": "ios-001"
}
```

Common errors:
- `400`: Invalid device ID format
- `401`: Missing/invalid/expired token
- `403`: Device mismatch with authenticated JWT context

---

### Get Current User

Get the current logged-in user's information.

```http
GET /im/v3/auth/me
Authorization: Bearer <access-token>
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "online",
    "lastSeenAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Usage Examples

### cURL

```bash
# User login
curl -X POST http://localhost:3000/im/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "password123"}'

# Get user info
curl -X GET http://localhost:3000/im/v3/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript

```javascript
// Login
const response = await fetch('http://localhost:3000/im/v3/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'johndoe',
    password: 'password123'
  })
});

const { data } = await response.json();
const { accessToken, user } = data;

// Store Token
localStorage.setItem('accessToken', accessToken);

// Use Token for API requests
const userResponse = await fetch('http://localhost:3000/im/v3/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// Login
const { user, accessToken } = await client.auth.login({
  username: 'johndoe',
  password: 'password123'
});

// Get current user
const currentUser = await client.auth.getCurrentUser();
```

---

## Security Recommendations

### Token Storage

- **Web Apps**: Use `httpOnly` cookies or `localStorage`
- **Mobile Apps**: Use secure local storage (Keychain/Keystore)
- **Server-side**: Use environment variables or secret management services

### Token Refresh Strategy

```typescript
// Auto-refresh token example
let accessToken = localStorage.getItem('accessToken');

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/im/v3/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const { data } = await response.json();
  accessToken = data.accessToken;
  localStorage.setItem('accessToken', accessToken);
  return accessToken;
}

// Request interceptor
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }
  
  return response;
}
```

---

## Next Steps

- [User Management API](./users.md) - User-related endpoints
- [Message Management API](./messages.md) - Messaging endpoints
- [SDK Documentation](../sdk/) - Simplify development with SDK

