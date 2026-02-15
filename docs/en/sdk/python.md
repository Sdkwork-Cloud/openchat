# Python SDK

## Installation

```bash
pip install openchat-sdk
```

## Quick Start

```python
from openchat import OpenChatClient

# Create client
client = OpenChatClient(
    server_url="http://localhost:3000",
    im_config={
        "tcp_addr": "localhost:5100",
        "ws_url": "ws://localhost:5200"
    }
)

# Initialize
await client.init()

# Login
response = await client.auth.login(
    username="user1",
    password="password123"
)

# Send message
await client.messages.send(
    to="user2",
    type="text",
    content="Hello, OpenChat!"
)
```

## Async Support

The SDK fully supports Python async programming:

```python
import asyncio
from openchat import OpenChatClient

async def main():
    client = OpenChatClient(server_url="http://localhost:3000")
    await client.init()
    # ...

asyncio.run(main())
```

## More Examples

See [GitHub Examples](https://github.com/openchat-team/sdk-python-examples).

## Next Steps

- [TypeScript SDK](./typescript.md) - TypeScript SDK
- [API Documentation](../api/) - Complete API reference
