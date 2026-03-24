# Android Wrapper

## 工作区

- 包装层：`sdkwork-im-sdk/sdkwork-im-sdk-android`
- 权威生成目标：`sdkwork-im-sdk/sdkwork-im-sdk-kotlin`

## 作用

该目录用于兼容历史上的 Android 命名入口，同时把真正的生成目标保持在 Kotlin 工作区。

## 命令

包装层脚本会自动转发到 Kotlin 工作区：

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## 规则

- 不要把生成代码写入 wrapper 目录
- 应以 Kotlin 工作区为权威生成目标
- Android 产品层代码应建立在 Kotlin 工作区之上