@echo off
chcp 65001 >nul

rem ============================================
rem OpenChat - Windows 快速安装脚本
rem 版本: 2.0.0
rem ============================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                   OpenChat 快速安装                          ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

rem 检查 Docker
echo [1/5] 检查 Docker...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Docker，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [成功] Docker 已安装

rem 检查 Docker Compose
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Docker Compose
    pause
    exit /b 1
)
echo [成功] Docker Compose 已安装

rem 配置环境
echo.
echo [2/5] 配置环境...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [成功] 已创建 .env 配置文件
    ) else (
        echo [警告] 未找到 .env.example，请手动创建 .env 文件
    )
) else (
    echo [跳过] .env 文件已存在
)

rem 创建目录
echo.
echo [3/5] 创建目录...
if not exist "var\logs" mkdir "var\logs"
if not exist "var\data" mkdir "var\data"
echo [成功] 目录创建完成

rem 拉取镜像
echo.
echo [4/5] 拉取镜像 (可能需要几分钟)...
docker compose -f docker-compose.quick.yml pull
if %ERRORLEVEL% neq 0 (
    echo [错误] 镜像拉取失败
    pause
    exit /b 1
)
echo [成功] 镜像拉取完成

rem 启动服务
echo.
echo [5/5] 启动服务...
docker compose -f docker-compose.quick.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [错误] 服务启动失败
    pause
    exit /b 1
)
echo [成功] 服务启动完成

rem 等待服务就绪
echo.
echo 等待服务就绪...
:wait_loop
curl -sf http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto :ready
timeout /t 2 /nobreak >nul
echo|set /p="."
goto :wait_loop

:ready
echo.
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    安装成功！                                ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 访问地址:
echo   • OpenChat API:    http://localhost:3000
echo   • API 文档:        http://localhost:3000/api/docs
echo   • 悟空IM Demo:     http://localhost:5172
echo.
echo 常用命令:
echo   • 查看日志:    docker compose logs -f
echo   • 停止服务:    docker compose down
echo   • 重启服务:    docker compose restart
echo.
pause
