# Go SDK

## Installation

```bash
go get github.com/openchat-team/sdk-go
```

## Quick Start

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

    // Initialize
    if err := client.Init(); err != nil {
        log.Fatal(err)
    }

    // Login
    resp, err := client.Auth.Login(&openchat.LoginRequest{
        Username: "user1",
        Password: "password123",
    })
    if err != nil {
        log.Fatal(err)
    }

    // Send message
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

## More Examples

See [GitHub Examples](https://github.com/openchat-team/sdk-go-examples).

## Next Steps

- [TypeScript SDK](./typescript.md) - TypeScript SDK
- [API Documentation](../api/) - Complete API reference
