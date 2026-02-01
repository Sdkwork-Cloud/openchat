# OpenChat Python SDK

Python SDK for OpenChat instant messaging service.

## Installation

```bash
pip install openchat-sdk
```

## Usage

```python
import asyncio
from openchat_sdk import OpenChat

# Initialize SDK
openchat = OpenChat(
    base_url="https://api.openchat.com",
    api_key="your-api-key"
)

# Login
async def login():
    try:
        auth_response = await openchat.auth.login(
            username="user@example.com",
            password="password"
        )
        print(f"Login success: {auth_response.user.username}")
    except Exception as e:
        print(f"Login failed: {e}")

# Listen to messages
@openchat.on("message_received")
def on_message_received(message):
    print(f"New message: {message.content.text}")

# Send message
async def send_message():
    try:
        message = await openchat.messages.send_text_message(
            to_user_id="user-id",
            text="Hello!"
        )
        print(f"Message sent: {message.id}")
    except Exception as e:
        print(f"Send failed: {e}")

# Run
asyncio.run(login())
```

## Features

- ✅ User authentication
- ✅ Real-time messaging
- ✅ Friend management
- ✅ Group chat
- ✅ File upload/download
- ✅ Async/await support
- ✅ Type hints

## Architecture

```
openchat_sdk/
├── __init__.py           # Main export
├── core/
│   ├── http_client.py    # requests/aiohttp wrapper
│   ├── websocket.py      # WebSocket client
│   └── event_bus.py      # Event bus
├── modules/
│   ├── auth.py
│   ├── user.py
│   ├── friend.py
│   ├── message.py
│   ├── group.py
│   ├── conversation.py
│   └── contact.py
├── models/
│   ├── user.py
│   ├── message.py
│   ├── group.py
│   └── conversation.py
└── utils/
    └── logger.py
```
