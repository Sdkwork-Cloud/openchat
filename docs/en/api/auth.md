# Authentication API

OpenChat uses JWT (JSON Web Token) for authentication, supporting access tokens and refresh tokens.

## Overview

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│   Server    │────>│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Login         │                   │
       │ ─────────────────>│                   │
       │                   │  2. Verify        │
       │                   │ ─────────────────>│
       │                   │                   │
       │                   │  3. User Data     │
       │                   │ <─────────────────│
       │  4. JWT Token     │                   │
       │ <─────────────────│                   │
       │                   │                   │
       │  5. API Request   │                   │
       │ ─────────────────>│                   │
       │     + Token       │                   │
       │                   │                   │
       │  6. Response      │                   │
       │ <─────────────────│                   │
```

### Token Types

| Token Type | Validity | Purpose |
|------------|----------|---------|
| Access Token | 7 days | API request authentication |
| Refresh Token | 30 days | Refresh Access Token |

---

## API Endpoints

### User Registration

Register a new user account.

```http
POST /api/auth/register
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
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "username": "string",    // Required
  "password": "string"     // Required
}
```

**Response Example:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
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
POST /api/auth/refresh
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
    "expiresIn": 604800,
    "tokenType": "Bearer"
  },
  "message": "Token refreshed successfully"
}
```

---

### User Logout

Logout and invalidate the current session.

```http
POST /api/auth/logout
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

### Get Current User

Get the current logged-in user's information.

```http
GET /api/auth/me
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
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "password123"}'

# Get user info
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
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
const userResponse = await fetch('http://localhost:3000/api/auth/me', {
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
  const response = await fetch('/api/auth/refresh', {
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
