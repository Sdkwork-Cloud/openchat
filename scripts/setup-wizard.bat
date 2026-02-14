@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 智能安装向导
rem 支持多种安装场景
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"

rem ANSI 颜色支持
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=!ESC![31m"
set "GREEN=!ESC![32m"
set "YELLOW=!ESC![33m"
set "BLUE=!ESC![34m"
set "CYAN=!ESC![36m"
set "BOLD=!ESC![1m"
set "NC=!ESC![0m"

rem 安装配置
set "INSTALL_ENV=production"
set "INSTALL_MODE=docker"
set "USE_EXISTING_DB=false"
set "USE_EXISTING_REDIS=false"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_USER=openchat"
set "DB_PASSWORD="
set "DB_NAME=openchat"
set "REDIS_HOST=localhost"
set "REDIS_PORT=6379"
set "REDIS_PASSWORD="
set "EXTERNAL_IP="

call :show_banner
call :main
exit /b 0

:show_banner
cls
echo.
echo  !BOLD!╔═══════════════════════════════════════════════════════════════╗!NC!
echo  !BOLD!║                                                               ║!NC!
echo  !BOLD!║   ██████╗ ██████╗ ███████╗ █████╗ ████████╗ █████╗ ██╗       ║!NC!
echo  !BOLD!║  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║       ║!NC!
echo  !BOLD!║  ██║   ██║██████╔╝█████╗  ███████║   ██║   ███████║██║       ║!NC!
echo  !BOLD!║  ██║   ██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══██║██║       ║!NC!
echo  !BOLD!║  ╚██████╔╝██║  ██║███████╗██║  ██║   ██║   ██║  ██║███████╗  ║!NC!
echo  !BOLD!║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝  ║!NC!
echo  !BOLD!║                                                               ║!NC!
echo  !BOLD!║           Open Source Instant Messaging Platform              ║!NC!
echo  !BOLD!║                     智能安装向导 v%APP_VERSION%                      ║!NC!
echo  !BOLD!║                                                               ║!NC!
echo  !BOLD!╚═══════════════════════════════════════════════════════════════╝!NC!
echo.
exit /b 0

:log_info
echo !BLUE![INFO]!NC! %~1
exit /b 0

:log_success
echo !GREEN![✓]!NC! %~1
exit /b 0

:log_warn
echo !YELLOW![!]!NC! %~1
exit /b 0

:log_error
echo !RED![✗]!NC! %~1
exit /b 0

:log_step
echo !CYAN![STEP]!NC! %~1
exit /b 0

:log_ask
set /p "ANSWER=!YELLOW![?]!NC! %~1"
exit /b 0

:select_environment
echo.
echo !BOLD!请选择安装环境:!NC!
echo   1) 开发环境 (Development)
echo   2) 测试环境 (Testing)
echo   3) 生产环境 (Production)
echo.
set /p "CHOICE=请选择 [1-3, 默认 3]: "

if "%CHOICE%"=="" set "CHOICE=3"
if "%CHOICE%"=="1" set "INSTALL_ENV=development"
if "%CHOICE%"=="2" set "INSTALL_ENV=test"
if "%CHOICE%"=="3" set "INSTALL_ENV=production"

call :log_success "选择环境: %INSTALL_ENV%"
exit /b 0

:select_install_mode
echo.
echo !BOLD!请选择安装模式:!NC!
echo   1) Docker Compose（推荐，自动管理所有依赖）
echo   2) 独立服务（使用已有数据库和 Redis）
echo   3) 混合模式（使用已有数据库，Docker 管理 Redis）
echo   4) 混合模式（使用已有 Redis，Docker 管理数据库）
echo.
set /p "CHOICE=请选择 [1-4, 默认 1]: "

if "%CHOICE%"=="" set "CHOICE=1"
if "%CHOICE%"=="1" set "INSTALL_MODE=docker"
if "%CHOICE%"=="2" (
    set "INSTALL_MODE=standalone"
    set "USE_EXISTING_DB=true"
    set "USE_EXISTING_REDIS=true"
)
if "%CHOICE%"=="3" (
    set "INSTALL_MODE=hybrid-db"
    set "USE_EXISTING_DB=true"
    set "USE_EXISTING_REDIS=false"
)
if "%CHOICE%"=="4" (
    set "INSTALL_MODE=hybrid-redis"
    set "USE_EXISTING_DB=false"
    set "USE_EXISTING_REDIS=true"
)

call :log_success "选择模式: %INSTALL_MODE%"
exit /b 0

:configure_existing_database
echo.
echo !BOLD!配置已有数据库连接:!NC!

set /p "DB_HOST=数据库主机地址 [localhost]: "
if "%DB_HOST%"=="" set "DB_HOST=localhost"

set /p "DB_PORT=数据库端口 [5432]: "
if "%DB_PORT%"=="" set "DB_PORT=5432"

set /p "DB_NAME=数据库名称 [openchat]: "
if "%DB_NAME%"=="" set "DB_NAME=openchat"

set /p "DB_USER=数据库用户名: "
set /p "DB_PASSWORD=数据库密码: "

call :log_info "测试数据库连接..."
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -c "SELECT 1" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "数据库连接失败，请检查配置"
    exit /b 1
)
call :log_success "数据库连接成功"
exit /b 0

:configure_existing_redis
echo.
echo !BOLD!配置已有 Redis 连接:!NC!

set /p "REDIS_HOST=Redis 主机地址 [localhost]: "
if "%REDIS_HOST%"=="" set "REDIS_HOST=localhost"

set /p "REDIS_PORT=Redis 端口 [6379]: "
if "%REDIS_PORT%"=="" set "REDIS_PORT=6379"

set /p "REDIS_PASSWORD=Redis 密码 (无密码请留空): "

call :log_info "测试 Redis 连接..."
if "%REDIS_PASSWORD%"=="" (
    redis-cli -h "%REDIS_HOST%" -p "%REDIS_PORT%" ping >nul 2>&1
) else (
    redis-cli -h "%REDIS_HOST%" -p "%REDIS_PORT%" -a "%REDIS_PASSWORD%" ping >nul 2>&1
)
if %ERRORLEVEL% neq 0 (
    call :log_error "Redis 连接失败，请检查配置"
    exit /b 1
)
call :log_success "Redis 连接成功"
exit /b 0

:get_server_ip
call :log_step "获取服务器 IP 地址..."

rem 尝试获取外网 IP
for /f "tokens=*" %%a in ('curl -s -4 --connect-timeout 5 ifconfig.me 2^>nul') do set "EXTERNAL_IP=%%a"

if "!EXTERNAL_IP!"=="" (
    rem 获取内网 IP
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "EXTERNAL_IP=%%a"
        set "EXTERNAL_IP=!EXTERNAL_IP: =!"
        goto :got_ip
    )
)

:got_ip
set /p "CONFIRM_IP=请输入服务器外网 IP [!EXTERNAL_IP!]: "
if not "!CONFIRM_IP!"=="" set "EXTERNAL_IP=!CONFIRM_IP!"

call :log_success "服务器 IP: %EXTERNAL_IP%"
exit /b 0

:generate_password
for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String((1..16 ^| ForEach-Object { Get-Random -Maximum 256 }))"') do set "GEN_PASS=%%a"
set "GEN_PASS=!GEN_PASS:/=!"
set "GEN_PASS=!GEN_PASS:+=!"
set "GEN_PASS=!GEN_PASS:==!"
call set "%~1=!GEN_PASS:~0,24!"
exit /b 0

:generate_jwt_secret
for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String((1..32 ^| ForEach-Object { Get-Random -Maximum 256 }))"') do set "%~1=%%a"
exit /b 0

:create_env_file
call :log_step "创建环境配置文件..."

if "%INSTALL_ENV%"=="development" (
    copy ".env.development" ".env" >nul
) else if "%INSTALL_ENV%"=="test" (
    copy ".env.test" ".env" >nul
) else (
    copy ".env.production" ".env" >nul
)

rem 更新配置
powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_HOST=.*', 'DB_HOST=%DB_HOST%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PORT=.*', 'DB_PORT=%DB_PORT%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_USER=.*', 'DB_USER=%DB_USER%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_NAME=.*', 'DB_NAME=%DB_NAME%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_HOST=.*', 'REDIS_HOST=%REDIS_HOST%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_PORT=.*', 'REDIS_PORT=%REDIS_PORT%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_PASSWORD=.*', 'REDIS_PASSWORD=%REDIS_PASSWORD%' | Set-Content .env"

call :generate_jwt_secret JWT_SECRET
powershell -Command "(Get-Content .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Set-Content .env"

call :log_success "环境配置文件创建完成"
exit /b 0

:create_docker_compose_config
call :log_step "创建 Docker Compose 配置..."

if "%USE_EXISTING_DB%"=="true" if "%USE_EXISTING_REDIS%"=="true" (
    (
        echo # OpenChat Docker Compose 覆盖配置
        echo # 使用已有数据库和 Redis
        echo version: '3.8'
        echo.
        echo services:
        echo   app:
        echo     environment:
        echo       - DB_HOST=%DB_HOST%
        echo       - DB_PORT=%DB_PORT%
        echo       - DB_USER=%DB_USER%
        echo       - DB_PASSWORD=%DB_PASSWORD%
        echo       - DB_NAME=%DB_NAME%
        echo       - REDIS_HOST=%REDIS_HOST%
        echo       - REDIS_PORT=%REDIS_PORT%
        echo       - REDIS_PASSWORD=%REDIS_PASSWORD%
        echo     extra_hosts:
        echo       - "host.docker.internal:host-gateway"
    ) > docker-compose.override.yml
)

call :log_success "Docker Compose 配置创建完成"
exit /b 0

:start_services
call :log_step "启动服务..."

if "%INSTALL_MODE%"=="docker" (
    call :log_info "拉取 Docker 镜像..."
    docker compose pull
    
    call :log_info "启动 Docker 服务..."
    docker compose up -d
    
    call :log_info "等待服务就绪..."
    timeout /t 10 >nul
    
    docker compose ps | findstr "Up" >nul
    if %ERRORLEVEL% neq 0 (
        call :log_error "服务启动失败，请检查日志"
        docker compose logs
        exit /b 1
    )
    call :log_success "服务启动成功"
)

exit /b 0

:show_install_result
echo.
echo !GREEN!╔═══════════════════════════════════════════════════════════════╗!NC!
echo !GREEN!║                    🎉 安装成功！                              ║!NC!
echo !GREEN!╚═══════════════════════════════════════════════════════════════╝!NC!
echo.
echo !BOLD!安装信息:!NC!
echo   • 安装环境: %INSTALL_ENV%
echo   • 安装模式: %INSTALL_MODE%
echo   • 数据库: %DB_HOST%:%DB_PORT%/%DB_NAME%
echo   • Redis: %REDIS_HOST%:%REDIS_PORT%
echo.
echo !BOLD!服务访问地址:!NC!
echo   • OpenChat API:    http://%EXTERNAL_IP%:3000
echo   • API 文档:        http://%EXTERNAL_IP%:3000/api/docs
echo   • 健康检查:        http://%EXTERNAL_IP%:3000/health
echo.
echo !BOLD!常用命令:!NC!
echo   • 查看日志:    docker compose logs -f
echo   • 停止服务:    docker compose down
echo   • 重启服务:    docker compose restart
echo.
echo !YELLOW!安全提示:!NC!
echo   ⚠️  请妥善保管 .env 文件中的密码和密钥
echo   ⚠️  生产环境建议启用 HTTPS
echo.
pause
exit /b 0

:main
rem 选择安装环境
call :select_environment

rem 选择安装模式
call :select_install_mode

rem 配置数据库
if "%USE_EXISTING_DB%"=="true" (
    call :configure_existing_database
)

rem 配置 Redis
if "%USE_EXISTING_REDIS%"=="true" (
    call :configure_existing_redis
)

rem 设置默认值
if "%USE_EXISTING_DB%"=="false" (
    set "DB_HOST=postgres"
    set "DB_USER=openchat"
    call :generate_password DB_PASSWORD
    set "DB_NAME=openchat"
)

if "%USE_EXISTING_REDIS%"=="false" (
    set "REDIS_HOST=redis"
    call :generate_password REDIS_PASSWORD
)

rem 获取服务器 IP
call :get_server_ip

rem 创建配置文件
call :create_env_file
call :create_docker_compose_config

rem 启动服务
call :start_services

rem 显示结果
call :show_install_result
exit /b 0
