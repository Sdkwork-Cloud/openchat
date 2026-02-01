# Python SDK

## 安装

```bash
pip install openchat-sdk
```

## 快速开始

```python
from openchat import OpenChatClient

# 创建客户端
client = OpenChatClient(
    server_url="http://localhost:3000",
    im_config={
        "tcp_addr": "localhost:5100",
        "ws_url": "ws://localhost:5200"
    }
)

# 初始化
await client.init()

# 登录
response = await client.auth.login(
    username="user1",
    password="password123"
)

# 发送消息
await client.messages.send(
    to="user2",
    type="text",
    content="Hello, OpenChat!"
)
```

## 异步支持

SDK 完全支持 Python 异步编程：

```python
import asyncio
from openchat import OpenChatClient

async def main():
    client = OpenChatClient(server_url="http://localhost:3000")
    await client.init()
    # ...

asyncio.run(main())
```

## 更多示例

请参考 [GitHub 示例项目](https://github.com/openchat-team/sdk-python-examples)。
