# Go SDK

## 安装

```bash
go get github.com/openchat-team/sdk-go
```

## 快速开始

```go
package main

import (
    "log"
    "github.com/openchat-team/sdk-go"
)

func main() {
    client, err := openchat.NewClient(&openchat.Config{
        ServerURL: "http://localhost:3000",
        IMConfig: &openchat.IMConfig{
            TCPAddr: "localhost:5100",
            WSURL:   "ws://localhost:5200",
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    // 初始化
    if err := client.Init(); err != nil {
        log.Fatal(err)
    }

    // 登录
    resp, err := client.Auth.Login(&openchat.LoginRequest{
        Username: "user1",
        Password: "password123",
    })
    if err != nil {
        log.Fatal(err)
    }

    // 发送消息
    _, err = client.Messages.Send(&openchat.MessageRequest{
        To:      "user2",
        Type:    openchat.MessageTypeText,
        Content: "Hello, OpenChat!",
    })
    if err != nil {
        log.Fatal(err)
    }
}
```

## 更多示例

请参考 [GitHub 示例项目](https://github.com/openchat-team/sdk-go-examples)。
