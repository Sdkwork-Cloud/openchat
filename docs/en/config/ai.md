# AI Configuration

## OpenAI Configuration

```json
{
  "ai": {
    "enabled": true,
    "defaultProvider": "openai",
    "providers": {
      "openai": {
        "apiKey": "your-api-key",
        "model": "gpt-3.5-turbo"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API Key |

## Supported Providers

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4, GPT-3.5 |
| Claude | Claude 3 |
| Azure OpenAI | GPT-4, GPT-3.5 |

## Next Steps

- [Server Configuration](./server.md) - Server config
- [RTC Configuration](./rtc.md) - RTC config
