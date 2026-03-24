# iOS Wrapper

## 工作区

- 包装层：`sdkwork-im-sdk/sdkwork-im-sdk-ios`
- 权威生成目标：`sdkwork-im-sdk/sdkwork-im-sdk-swift`

## 作用

该目录用于兼容历史上的 iOS 命名入口，同时把真正的生成目标保持在 Swift 工作区。

## 命令

包装层脚本会自动转发到 Swift 工作区：

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
- 应以 Swift 工作区为权威生成目标
- iOS 产品层代码应建立在 Swift 工作区之上