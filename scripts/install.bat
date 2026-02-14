@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 一键安装脚本
rem 版本: 2.0.0
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

rem 颜色代码
for /f %%i in ('echo prompt $E^| cmd') do set "ESC=%%i"
set "RED=!ESC![91m"
set "GREEN=!ESC![92m"
set "YELLOW=!ESC![93m"
set "BLUE=!ESC![94m"
set "CYAN=!ESC![96m"
set "RESET=!ESC![0m"

rem 主入口
if "%~1"=="" goto :interactive
if /i "%~1"=="install" goto :install
if /i "%~1"=="start" goto :start
if /i "%~1"=="stop" goto :stop
if /i "%~1"=="restart" goto :restart
if /i "%~1"=="status" goto :status
if /i "%~1"=="logs" goto :logs
if /i "%~1"=="clean" goto :clean
if /i "%~1"=="update" goto :update
if /i "%~1"=="uninstall" goto :uninstall
if /i "%~1"=="help" goto :help
goto :help

rem ============================================
rem 显示横幅
rem ============================================
:show_banner
cls
echo.
echo !CYAN!╔═══════════════════════════════════════════════════════════════╗!RESET!
echo !CYAN!║                                                               ║!RESET!
echo !CYAN!║   ██████╗ ██████╗ ███████╗ █████╗ ████████╗ █████╗ ██╗       ║!RESET!
echo !CYAN!║  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║       ║!RESET!
echo !CYAN!║  ██║   ██║██████╔╝█████╗  ███████║   ██║   ███████║██║       ║!RESET!
echo !CYAN!║  ██║   ██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══██║██║       ║!RESET!
echo !CYAN!║  ╚██████╔╝██║  ██║███████╗██║  ██║   ██║   ██║  ██║███████╗  ║!RESET!
echo !CYAN!║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝  ║!RESET!
echo !CYAN!║                                                               ║!RESET!
echo !CYAN!║           Open Source Instant Messaging Platform              ║!RESET!
echo !CYAN!║                     Version %APP_VERSION%                           ║!RESET!
echo !CYAN!║                                                               ║!RESET!
echo !CYAN!╚═══════════════════════════════════════════════════════════════╝!RESET!
echo.
goto :eof

rem ============================================
rem 交互式安装
rem ============================================
:interactive
call :show_banner
echo !BLUE![INFO]!RESET! 开始交互式安装...
echo.

rem 检查 Docker
echo !BLUE![STEP]!RESET! 检查系统依赖...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 未找到 Docker，请先安装 Docker Desktop
    echo !YELLOW![INFO]!RESET! 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! Docker 已安装

docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 未找到 Docker Compose
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! Docker Compose 已安装

rem 检查端口冲突
echo.
echo !BLUE![STEP]!RESET! 检查端口冲突...
set "PORT_CONFLICT=0"
for %%p in (3000 5432 6379 5001 5100 5200 5300) do (
    netstat -ano | findstr ":%%p " >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo !YELLOW![WARN]!RESET! 端口 %%p 已被占用
        set "PORT_CONFLICT=1"
    )
)
if "%PORT_CONFLICT%"=="1" (
    echo.
    echo !YELLOW![WARN]!RESET! 检测到端口冲突，您可以:
    echo   1. 停止占用端口的服务
    echo   2. 修改 .env 文件中的端口配置
    echo.
    set /p CONTINUE="是否继续安装? (y/N): "
    if /i not "!CONTINUE!"=="y" exit /b 1
) else (
    echo !GREEN![SUCCESS]!RESET! 端口检查通过
)

rem 选择环境
echo.
echo !BLUE![INFO]!RESET! 请选择部署环境:
echo   1. 开发环境 ^(development^)
echo   2. 测试环境 ^(test^)
echo   3. 生产环境 ^(production^)
echo.
set /p ENV_CHOICE="请输入选项 [1-3，默认1]: "

if "%ENV_CHOICE%"=="" set ENV_CHOICE=1
if "%ENV_CHOICE%"=="1" set "ENV=development"
if "%ENV_CHOICE%"=="2" set "ENV=test"
if "%ENV_CHOICE%"=="3" set "ENV=production"

echo !GREEN![SUCCESS]!RESET! 已选择: %ENV% 环境

rem 获取服务器 IP
echo.
echo !BLUE![INFO]!RESET! 检测服务器 IP 地址...

rem 尝试获取外网 IP
for /f "delims=" %%i in ('curl -s --connect-timeout 5 https://api.ipify.org 2^>nul') do set EXTERNAL_IP=%%i

if "%EXTERNAL_IP%"=="" (
    rem 获取内网 IP
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        for /f "tokens=1,2 delims= " %%b in ("%%a") do set EXTERNAL_IP=%%b
    )
)

echo !GREEN![SUCCESS]!RESET! 检测到 IP: %EXTERNAL_IP%
set /p CONFIRM_IP="请确认服务器 IP [%EXTERNAL_IP%]: "
if not "%CONFIRM_IP%"=="" set EXTERNAL_IP=%CONFIRM_IP%

rem 配置环境变量
echo.
echo !BLUE![STEP]!RESET! 配置环境变量...

cd /d "%PROJECT_ROOT%"

if exist ".env" (
    echo !YELLOW![WARN]!RESET! .env 文件已存在，跳过配置
) else (
    if exist ".env.%ENV%" (
        copy ".env.%ENV%" ".env" >nul
    ) else if exist ".env.example" (
        copy ".env.example" ".env" >nul
    )
    
    rem 更新 EXTERNAL_IP
    if exist ".env" (
        powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"
    )
    
    echo !GREEN![SUCCESS]!RESET! 环境变量配置完成
)

rem 创建目录
echo.
echo !BLUE![STEP]!RESET! 创建目录结构...
if not exist "var\logs" mkdir "var\logs"
if not exist "var\data" mkdir "var\data"
if not exist "var\run" mkdir "var\run"
if not exist "backups" mkdir "backups"
echo !GREEN![SUCCESS]!RESET! 目录结构创建完成

rem 拉取镜像
echo.
echo !BLUE![STEP]!RESET! 拉取 Docker 镜像...
echo !YELLOW![INFO]!RESET! 这可能需要几分钟，请耐心等待...
docker compose pull
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 镜像拉取失败
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! 镜像拉取完成

rem 启动服务
echo.
echo !BLUE![STEP]!RESET! 启动服务...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 服务启动失败
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! 服务启动完成

rem 等待服务就绪
echo.
echo !BLUE![INFO]!RESET! 等待服务就绪...
set /a ATTEMPTS=0
:wait_loop
curl -sf http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto :service_ready
set /a ATTEMPTS+=1
if %ATTEMPTS% geq 60 (
    echo !RED![ERROR]!RESET! 服务启动超时
    goto :show_logs_hint
)
timeout /t 2 /nobreak >nul
echo|set /p="."
goto :wait_loop

:service_ready
echo.
echo !GREEN![SUCCESS]!RESET! OpenChat 服务已就绪

rem 显示访问信息
echo.
echo !GREEN!╔═══════════════════════════════════════════════════════════════╗!RESET!
echo !GREEN!║                    🎉 安装成功！                              ║!RESET!
echo !GREEN!╚═══════════════════════════════════════════════════════════════╝!RESET!
echo.
echo 服务访问地址:
echo   • OpenChat API:    http://%EXTERNAL_IP%:3000
echo   • API 文档:        http://%EXTERNAL_IP%:3000/api/docs
echo   • 健康检查:        http://%EXTERNAL_IP%:3000/health
echo   • 悟空IM Demo:     http://%EXTERNAL_IP%:5172
echo   • 悟空IM 管理后台: http://%EXTERNAL_IP%:5300/web
echo.
echo 常用命令:
echo   • 查看日志:    docker compose logs -f
echo   • 停止服务:    docker compose down
echo   • 重启服务:    docker compose restart
echo   • 查看状态:    docker compose ps
echo.
echo !YELLOW!安全提示:!RESET!
echo   ⚠️  生产环境请修改 .env 文件中的默认密码
echo   ⚠️  建议配置防火墙，限制数据库端口仅内网访问
echo.
goto :eof

:show_logs_hint
echo.
echo !YELLOW![INFO]!RESET! 查看日志: docker compose logs -f
pause
exit /b 1

rem ============================================
rem 安装命令
rem ============================================
:install
call :show_banner
echo !BLUE![INFO]!RESET! 执行安装...
goto :interactive

rem ============================================
rem 启动服务
rem ============================================
:start
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 启动服务...
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 服务已启动
goto :eof

rem ============================================
rem 停止服务
rem ============================================
:stop
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 停止服务...
docker compose down
echo !GREEN![SUCCESS]!RESET! 服务已停止
goto :eof

rem ============================================
rem 重启服务
rem ============================================
:restart
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 重启服务...
docker compose down
timeout /t 2 /nobreak >nul
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 服务已重启
goto :eof

rem ============================================
rem 查看状态
rem ============================================
:status
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 服务状态:
docker compose ps
echo.
echo !BLUE![INFO]!RESET! 资源使用:
docker stats --no-stream
goto :eof

rem ============================================
rem 查看日志
rem ============================================
:logs
cd /d "%PROJECT_ROOT%"
docker compose logs -f %2
goto :eof

rem ============================================
rem 清理数据
rem ============================================
:clean
cd /d "%PROJECT_ROOT%"
echo !RED![WARN]!RESET! 这将删除所有数据!
set /p CONFIRM="确认清理所有数据? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo !YELLOW![INFO]!RESET! 已取消
    goto :eof
)
echo !BLUE![INFO]!RESET! 清理数据...
docker compose down -v
del /q "var\logs\*" 2>nul
del /q "var\data\*" 2>nul
echo !GREEN![SUCCESS]!RESET! 数据已清理
goto :eof

rem ============================================
rem 更新服务
rem ============================================
:update
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 更新服务...
docker compose pull
docker compose build
docker compose down
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 更新完成
goto :eof

rem ============================================
rem 卸载
rem ============================================
:uninstall
cd /d "%PROJECT_ROOT%"
echo !RED![WARN]!RESET! 这将卸载 OpenChat!
set /p CONFIRM="确认卸载? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo !YELLOW![INFO]!RESET! 已取消
    goto :eof
)
echo !BLUE![INFO]!RESET! 卸载 OpenChat...
docker compose down -v
echo !GREEN![SUCCESS]!RESET! 卸载完成
goto :eof

rem ============================================
rem 帮助
rem ============================================
:help
call :show_banner
echo 用法: %~nx0 [命令]
echo.
echo 命令:
echo   install     安装 OpenChat (交互式)
echo   start       启动服务
echo   stop        停止服务
echo   restart     重启服务
echo   status      查看服务状态
echo   logs        查看日志
echo   clean       清理所有数据
echo   update      更新服务
echo   uninstall   卸载 OpenChat
echo   help        显示帮助
echo.
echo 示例:
echo   %~nx0              # 交互式安装
echo   %~nx0 start        # 启动服务
echo   %~nx0 logs app     # 查看应用日志
echo.
goto :eof
