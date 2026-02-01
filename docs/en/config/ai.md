# AI 配置

## OpenAI 配置

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

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
