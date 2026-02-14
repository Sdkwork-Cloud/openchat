@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 智能安装管理器
rem 支持安装检测、错误恢复、回滚功能
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"
set "INSTALL_STATE_FILE=.openchat-install-state"
set "INSTALL_LOG_FILE=var\logs\install.log"
set "BACKUP_DIR=var\backups"

rem 安装状态
set "STATE_NOT_INSTALLED=not_installed"
set "STATE_INSTALLING=installing"
set "STATE_INSTALLED=installed"
set "STATE_FAILED=failed"
set "STATE_PARTIAL=partial"

rem 当前状态
set "CURRENT_STATE="
set "INSTALL_STEP="
set "LAST_ERROR="

rem ANSI 颜色支持
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=!ESC![31m"
set "GREEN=!ESC![32m"
set "YELLOW=!ESC![33m"
set "BLUE=!ESC![34m"
set "CYAN=!ESC![36m"
set "BOLD=!ESC![1m"
set "NC=!ESC![0m"

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
echo  !BOLD!║                     智能安装管理器 v%APP_VERSION%                      ║!NC!
echo  !BOLD!║                                                               ║!NC!
echo  !BOLD!╚═══════════════════════════════════════════════════════════════╝!NC!
echo.
exit /b 0

:log_info
echo !BLUE![INFO]!NC! %~1
call :write_log "INFO" "%~1"
exit /b 0

:log_success
echo !GREEN![✓]!NC! %~1
call :write_log "SUCCESS" "%~1"
exit /b 0

:log_warn
echo !YELLOW![!]!NC! %~1
call :write_log "WARN" "%~1"
exit /b 0

:log_error
echo !RED![✗]!NC! %~1
call :write_log "ERROR" "%~1"
set "LAST_ERROR=%~1"
exit /b 0

:log_step
echo !CYAN![STEP]!NC! %~1
call :write_log "STEP" "%~1"
exit /b 0

:write_log
setlocal
set "level=%~1"
set "message=%~2"
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "log_date=%%c-%%a-%%b"
for /f "tokens=1-3 delims=:." %%a in ('time /t') do set "log_time=%%a:%%b:%%c"
echo [%log_date% %log_time%] [%level%] %message% >> "%INSTALL_LOG_FILE%"
endlocal
exit /b 0

:init_install_env
if not exist "var\logs" mkdir "var\logs"
if not exist "var\backups" mkdir "var\backups"
if not exist "var\data" mkdir "var\data"
if not exist "%INSTALL_LOG_FILE%" type nul > "%INSTALL_LOG_FILE%"
call :log_info "初始化安装环境"
exit /b 0

:read_install_state
if exist "%INSTALL_STATE_FILE%" (
    for /f "tokens=1,2 delims==" %%a in (%INSTALL_STATE_FILE%) do (
        if "%%a"=="STATE" set "CURRENT_STATE=%%b"
        if "%%a"=="STEP" set "INSTALL_STEP=%%b"
        if "%%a"=="ERROR" set "LAST_ERROR=%%b"
    )
) else (
    set "CURRENT_STATE=%STATE_NOT_INSTALLED%"
)
exit /b 0

:save_install_state
setlocal
set "state=%~1"
set "step=%~2"
set "error=%~3"
(
    echo # OpenChat 安装状态文件
    echo # 自动生成，请勿手动编辑
    echo STATE=%state%
    echo STEP=%step%
    echo ERROR=%error%
    echo TIMESTAMP=%date% %time%
    echo VERSION=%APP_VERSION%
) > "%INSTALL_STATE_FILE%"
endlocal
set "CURRENT_STATE=%~1"
set "INSTALL_STEP=%~2"
exit /b 0

:check_existing_installation
call :log_step "检查现有安装..."

set "INSTALLED=false"

if exist ".env" (
    call :log_warn "发现 .env 配置文件"
    set "INSTALLED=true"
)

docker ps --format "{{.Names}}" 2>nul | findstr "openchat" >nul
if %ERRORLEVEL% equ 0 (
    call :log_warn "发现运行中的 OpenChat 容器"
    set "INSTALLED=true"
)

if exist ".env" (
    call :load_env
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        call :log_warn "数据库已存在 OpenChat 表结构"
        set "INSTALLED=true"
    )
)

if "%INSTALLED%"=="true" (
    exit /b 0
) else (
    call :log_success "未检测到已有安装"
    exit /b 1
)

:load_env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set "%%a=%%b"
)
exit /b 0

:handle_existing_installation
echo.
echo !BOLD!请选择操作:!NC!
echo   1) 跳过已安装部分，继续安装
echo   2) 重新安装（保留数据）
echo   3) 完全重新安装（清除数据）
echo   4) 退出安装
echo.
set /p "CHOICE=请选择 [1-4]: "

if "%CHOICE%"=="1" (
    call :log_info "跳过已安装部分，继续安装..."
    exit /b 0
)
if "%CHOICE%"=="2" (
    call :log_info "准备重新安装（保留数据）..."
    call :backup_data
    call :cleanup_installation false
    exit /b 0
)
if "%CHOICE%"=="3" (
    call :log_warn "警告: 这将删除所有数据!"
    set /p "CONFIRM=确认完全重新安装? (yes/no): "
    if "!CONFIRM!"=="yes" (
        call :log_info "准备完全重新安装..."
        call :backup_data
        call :cleanup_installation true
        exit /b 0
    ) else (
        call :log_info "已取消"
        exit 1
    )
)
if "%CHOICE%"=="4" (
    call :log_info "退出安装"
    exit 1
)
call :log_error "无效选择"
exit 1

:backup_data
call :log_step "备份现有数据..."

set "BACKUP_TIME=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_TIME=!BACKUP_TIME: =0!"
set "BACKUP_PATH=%BACKUP_DIR%\backup_%BACKUP_TIME%"

if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

if exist ".env" (
    copy ".env" "%BACKUP_PATH%\.env" >nul
    call :log_success "备份 .env 文件"
)

if exist "var\logs" (
    xcopy "var\logs" "%BACKUP_PATH%\logs\" /E /I /Q >nul
    call :log_success "备份日志文件"
)

call :log_success "备份完成: %BACKUP_PATH%"
exit /b 0

:cleanup_installation
setlocal
set "FULL_CLEANUP=%~1"

call :log_step "清理现有安装..."

docker ps -a --format "{{.Names}}" 2>nul | findstr "openchat" >nul
if %ERRORLEVEL% equ 0 (
    docker compose down -v 2>nul
    call :log_success "停止 Docker 容器"
)

if "%FULL_CLEANUP%"=="true" (
    if exist ".env" del ".env"
    if exist "docker-compose.override.yml" del "docker-compose.override.yml"
    call :log_success "删除配置文件"
    
    if exist "var\data" rd /s /q "var\data"
    if exist "var\logs" rd /s /q "var\logs"
    call :log_success "删除数据目录"
)

if exist "%INSTALL_STATE_FILE%" del "%INSTALL_STATE_FILE%"
endlocal
exit /b 0

:handle_error
setlocal
set "STEP=%~1"
set "ERROR=%~2"

call :log_error "安装失败: %ERROR%"
call :save_install_state "%STATE_FAILED%" "%STEP%" "%ERROR%"

echo.
echo !RED!╔═══════════════════════════════════════════════════════════════╗!NC!
echo !RED!║                    安装失败                                   ║!NC!
echo !RED!╚═══════════════════════════════════════════════════════════════╝!NC!
echo.
echo !BOLD!错误信息:!NC! %ERROR%
echo !BOLD!失败步骤:!NC! %STEP%
echo.
echo !BOLD!恢复选项:!NC!
echo   1) 重试当前步骤
echo   2) 查看详细日志
echo   3) 退出安装
echo.
set /p "CHOICE=请选择 [1-3]: "

if "%CHOICE%"=="1" (
    call :log_info "重试当前步骤..."
    exit /b 1
)
if "%CHOICE%"=="2" (
    echo.
    echo !BOLD!安装日志:!NC!
    type "%INSTALL_LOG_FILE%" | more
    echo.
    pause
    exit /b 1
)
call :log_info "退出安装，可稍后重新运行脚本继续"
exit 1

:step_check_environment
set "INSTALL_STEP=environment"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "检查系统环境..."

set "ERRORS="

docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set "ERRORS=!ERRORS! Docker 未安装"
) else (
    docker info >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        set "ERRORS=!ERRORS! Docker 服务未运行"
    ) else (
        call :log_success "Docker 已安装并运行"
    )
)

docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set "ERRORS=!ERRORS! Docker Compose 未安装"
) else (
    call :log_success "Docker Compose 已安装"
)

if not "!ERRORS!"=="" (
    call :log_error "环境检查失败:!ERRORS!"
    call :handle_error "%INSTALL_STEP%" "环境检查失败"
    exit /b !ERRORLEVEL!
)

call :log_success "环境检查通过"
exit /b 0

:step_configure
set "INSTALL_STEP=config"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "配置安装参数..."

echo.
echo !BOLD!选择安装环境:!NC!
echo   1) 开发环境 (Development)
echo   2) 测试环境 (Testing)
echo   3) 生产环境 (Production)
echo.
set /p "CHOICE=请选择 [1-3, 默认 3]: "

if "%CHOICE%"=="" set "CHOICE=3"
if "%CHOICE%"=="1" set "ENV_NAME=development"
if "%CHOICE%"=="2" set "ENV_NAME=test"
if "%CHOICE%"=="3" set "ENV_NAME=production"

if not exist ".env" (
    copy ".env.%ENV_NAME%" ".env" >nul
    call :log_success "创建 .env 配置文件"
) else (
    call :log_warn ".env 已存在，跳过创建"
)

rem 获取服务器 IP
for /f "tokens=*" %%a in ('curl -s -4 --connect-timeout 5 ifconfig.me 2^>nul') do set "EXTERNAL_IP=%%a"
if "!EXTERNAL_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "EXTERNAL_IP=%%a"
        set "EXTERNAL_IP=!EXTERNAL_IP: =!"
        goto :got_ip
    )
)
:got_ip
set /p "CONFIRM_IP=服务器外网 IP [!EXTERNAL_IP!]: "
if not "!CONFIRM_IP!"=="" set "EXTERNAL_IP=!CONFIRM_IP!"

powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"

rem 生成 JWT 密钥
for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String((1..32 ^| ForEach-Object { Get-Random -Maximum 256 }))"') do set "JWT_SECRET=%%a"
powershell -Command "(Get-Content .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Set-Content .env"

call :log_success "配置完成"
exit /b 0

:step_start_services
set "INSTALL_STEP=services"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "启动服务..."

call :log_info "拉取 Docker 镜像..."
docker compose pull
if %ERRORLEVEL% neq 0 (
    call :handle_error "%INSTALL_STEP%" "镜像拉取失败"
    exit /b !ERRORLEVEL!
)

call :log_info "启动 Docker 服务..."
docker compose up -d
if %ERRORLEVEL% neq 0 (
    call :handle_error "%INSTALL_STEP%" "服务启动失败"
    exit /b !ERRORLEVEL!
)

call :log_info "等待服务就绪..."
set /a WAITED=0
set /a MAX_WAIT=120

:wait_loop
if %WAITED% geq %MAX_WAIT% (
    call :handle_error "%INSTALL_STEP%" "服务启动超时"
    exit /b !ERRORLEVEL!
)

curl -s http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call :log_success "服务启动成功"
    goto :wait_done
)

echo|set /p="."
timeout /t 2 >nul
set /a WAITED+=2
goto :wait_loop

:wait_done
exit /b 0

:step_verify
set "INSTALL_STEP=verify"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "验证安装..."

curl -s http://localhost:3000/health | findstr "ok" >nul
if %ERRORLEVEL% equ 0 (
    call :log_success "API 服务正常"
) else (
    call :log_error "API 服务异常"
    call :handle_error "%INSTALL_STEP%" "验证失败"
    exit /b !ERRORLEVEL!
)

exit /b 0

:show_install_result
call :load_env

echo.
echo !GREEN!╔═══════════════════════════════════════════════════════════════╗!NC!
echo !GREEN!║                    🎉 安装成功！                              ║!NC!
echo !GREEN!╚═══════════════════════════════════════════════════════════════╝!NC!
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
call :init_install_env
call :read_install_state

call :check_existing_installation
if %ERRORLEVEL% equ 0 (
    call :handle_existing_installation
    if %ERRORLEVEL% neq 0 exit /b 1
)

if "%CURRENT_STATE%"=="%STATE_FAILED%" (
    echo.
    call :log_warn "检测到上次安装失败"
    call :log_info "失败步骤: %INSTALL_STEP%"
    call :log_info "错误信息: %LAST_ERROR%"
    echo.
    set /p "CONTINUE=是否从失败处继续安装? (Y/n): "
    if /i "!CONTINUE!"=="n" (
        set "CURRENT_STATE=%STATE_NOT_INSTALLED%"
    )
)

rem 执行安装步骤
call :step_check_environment
if %ERRORLEVEL% neq 0 if %ERRORLEVEL% neq 1 exit /b 1

call :step_configure
if %ERRORLEVEL% neq 0 if %ERRORLEVEL% neq 1 exit /b 1

call :step_start_services
if %ERRORLEVEL% neq 0 if %ERRORLEVEL% neq 1 exit /b 1

call :step_verify
if %ERRORLEVEL% neq 0 if %ERRORLEVEL% neq 1 exit /b 1

call :save_install_state "%STATE_INSTALLED%" "complete" ""
call :show_install_result
exit /b 0
