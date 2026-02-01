# 一键部署

## 使用一键部署脚本

```bash
# 克隆项目
git clone https://github.com/openchat-team/openchat-server.git
cd openchat-server

# 运行一键部署脚本
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

## 脚本功能

- 检查 Docker 环境
- 检测服务器 IP
- 生成配置文件
- 拉取镜像
- 启动服务
- 等待服务就绪

## 访问服务

- OpenChat API: http://your-server-ip:3000
- 悟空IM Demo: http://your-server-ip:5172
- 管理后台: http://your-server-ip:5300/web
