# sdkwork-im-admin-sdk

Professional TypeScript SDK for SDKWork API.

## Installation

```bash
npm install @sdkwork/im-admin-backend-sdk
# or
yarn add @sdkwork/im-admin-backend-sdk
# or
pnpm add @sdkwork/im-admin-backend-sdk
```

## Quick Start

```typescript
import { SdkworkBackendClient } from '@sdkwork/im-admin-backend-sdk';

const client = new SdkworkBackendClient({
  baseUrl: 'http://127.0.0.1:3000',
  timeout: 30000,
});

// Mode A: API Key (recommended for server-to-server calls)
client.setApiKey('your-api-key');

// Use the SDK
const result = await client.adminDashboard.controllerGetOverview();
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```typescript
const client = new SdkworkBackendClient({ baseUrl: 'http://127.0.0.1:3000' });
client.setApiKey('your-api-key');
// Sends: X-API-Key: <apiKey>
```

### Mode B: Dual Token

```typescript
const client = new SdkworkBackendClient({ baseUrl: 'http://127.0.0.1:3000' });
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```typescript
import { SdkworkBackendClient } from '@sdkwork/im-admin-backend-sdk';

const client = new SdkworkBackendClient({
  baseUrl: 'http://127.0.0.1:3000',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.adminDashboard` - admin_dashboard API
- `client.adminUsers` - admin_users API
- `client.adminGroups` - admin_groups API
- `client.adminFriends` - admin_friends API
- `client.adminMessages` - admin_messages API
- `client.adminIot` - admin_iot API
- `client.adminSystem` - admin_system API
- `client.rtcAdmin` - rtc_admin API
- `client.wukongimAdmin` - wukongim_admin API

## Usage Examples

### admin_dashboard

```typescript
// GET /dashboard/overview
const result = await client.adminDashboard.controllerGetOverview();
```

### admin_users

```typescript
// GET /users
const params = {} as Record<string, any>;
const result = await client.adminUsers.controllerList(params);
```

### admin_groups

```typescript
// GET /groups
const params = {} as Record<string, any>;
const result = await client.adminGroups.controllerList(params);
```

### admin_friends

```typescript
// GET /friends
const params = {} as Record<string, any>;
const result = await client.adminFriends.controllerList(params);
```

### admin_messages

```typescript
// GET /messages
const params = {} as Record<string, any>;
const result = await client.adminMessages.controllerList(params);
```

### admin_iot

```typescript
// GET /iot/devices
const params = {} as Record<string, any>;
const result = await client.adminIot.controllerListDevices(params);
```

### admin_system

```typescript
// GET /system/summary
const result = await client.adminSystem.controllerGetSummary();
```

### rtc_admin

```typescript
// Get all RTC channel configs
const result = await client.rtcAdmin.controllerGetChannels();
```

### wukongim_admin

```typescript
// Check WuKongIM control-plane health
const result = await client.wukongimAdmin.wukongImadminControllerHealthCheck();
```

## Error Handling

```typescript
import { SdkworkBackendClient, NetworkError, TimeoutError, AuthenticationError } from '@sdkwork/im-admin-backend-sdk';

try {
  const result = await client.adminDashboard.controllerGetOverview();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Set `NPM_TOKEN` (and optional `NPM_REGISTRY_URL`) before release publish.

## License

MIT
