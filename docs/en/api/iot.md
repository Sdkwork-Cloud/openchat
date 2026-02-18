# IoT Devices API

IoT Devices API provides IoT device management capabilities.

## Overview

All IoT APIs require JWT authentication. Path prefix: `/im/api/v1/iot`.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Register Device | POST | `/iot/devices` | Register a new device |
| Get Device | GET | `/iot/devices/:id` | Get device details |
| List Devices | GET | `/iot/devices` | List all devices |
| Update Device | PUT | `/iot/devices/:id` | Update device info |
| Delete Device | DELETE | `/iot/devices/:id` | Delete a device |
| Send Command | POST | `/iot/devices/:id/command` | Send command to device |
| Get Device State | GET | `/iot/devices/:id/state` | Get device state |

---

## Register Device

Register a new IoT device.

```http
POST /im/api/v1/iot/devices
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body

```json
{
  "name": "Smart Light",
  "type": "light",
  "deviceId": "device-001",
  "capabilities": ["on/off", "brightness", "color"]
}
```

### Response

```json
{
  "id": "iot-uuid",
  "name": "Smart Light",
  "type": "light",
  "deviceId": "device-001",
  "status": "online",
  "capabilities": ["on/off", "brightness", "color"],
  "createdAt": "2024-01-15T10:30:00Z"
}
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

// Get devices
const devices = await client.api.iot.getDevices();

// Register device
const device = await client.api.iot.registerDevice({
  name: 'Smart Light',
  type: 'light',
  deviceId: 'device-001'
});

// Send command
await client.api.iot.sendCommand('device-id', {
  command: 'setBrightness',
  params: { value: 80 }
});
```

---

## Related Links

- [Message Management API](./messages.md)
- [User Management API](./users.md)
