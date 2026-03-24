@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 鏅鸿兘瀹夎绠＄悊鍣?rem 鏀寔瀹夎妫€娴嬨€侀敊璇仮澶嶃€佸洖婊氬姛鑳?rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"
set "INSTALL_STATE_FILE=.openchat-install-state"
set "INSTALL_LOG_FILE=var\logs\install.log"
set "BACKUP_DIR=var\backups"

rem 瀹夎鐘舵€?set "STATE_NOT_INSTALLED=not_installed"
set "STATE_INSTALLING=installing"
set "STATE_INSTALLED=installed"
set "STATE_FAILED=failed"
set "STATE_PARTIAL=partial"

rem 褰撳墠鐘舵€?set "CURRENT_STATE="
set "INSTALL_STEP="
set "LAST_ERROR="

rem ANSI 棰滆壊鏀寔
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
echo  !BOLD!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo  !BOLD!鈺?                                                              鈺?NC!
echo  !BOLD!鈺?  鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈺?      鈺?NC!
echo  !BOLD!鈺? 鈻堚枅鈺斺晲鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺愨晲鈺濃枅鈻堚晹鈺愨晲鈻堚枅鈺椻暁鈺愨晲鈻堚枅鈺斺晲鈺愨暆鈻堚枅鈺斺晲鈺愨枅鈻堚晽鈻堚枅鈺?      鈺?NC!
echo  !BOLD!鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚枅鈻堚枅鈺? 鈻堚枅鈻堚枅鈻堚枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈻堚枅鈻堚枅鈻堚晳鈻堚枅鈺?      鈺?NC!
echo  !BOLD!鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺? 鈻堚枅鈺斺晲鈺愨枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈺斺晲鈺愨枅鈻堚晳鈻堚枅鈺?      鈺?NC!
echo  !BOLD!鈺? 鈺氣枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚晳  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺椻枅鈻堚晳  鈻堚枅鈺?  鈻堚枅鈺?  鈻堚枅鈺? 鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺? 鈺?NC!
echo  !BOLD!鈺?  鈺氣晲鈺愨晲鈺愨晲鈺?鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺濃暁鈺愨暆  鈺氣晲鈺?  鈺氣晲鈺?  鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺? 鈺?NC!
echo  !BOLD!鈺?                                                              鈺?NC!
echo  !BOLD!鈺?          Open Source Instant Messaging Platform              鈺?NC!
echo  !BOLD!鈺?                    鏅鸿兘瀹夎绠＄悊鍣?v%APP_VERSION%                      鈺?NC!
echo  !BOLD!鈺?                                                              鈺?NC!
echo  !BOLD!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo.
exit /b 0

:log_info
echo !BLUE![INFO]!NC! %~1
call :write_log "INFO" "%~1"
exit /b 0

:log_success
echo !GREEN![鉁揮!NC! %~1
call :write_log "SUCCESS" "%~1"
exit /b 0

:log_warn
echo !YELLOW![!]!NC! %~1
call :write_log "WARN" "%~1"
exit /b 0

:log_error
echo !RED![鉁梋!NC! %~1
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
call :log_info "鍒濆鍖栧畨瑁呯幆澧?
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
    echo # OpenChat 瀹夎鐘舵€佹枃浠?    echo # 鑷姩鐢熸垚锛岃鍕挎墜鍔ㄧ紪杈?    echo STATE=%state%
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
call :log_step "妫€鏌ョ幇鏈夊畨瑁?.."

set "INSTALLED=false"

if exist ".env" (
    call :log_warn "鍙戠幇 .env 閰嶇疆鏂囦欢"
    set "INSTALLED=true"
)

docker ps --format "{{.Names}}" 2>nul | findstr "openchat" >nul
if %ERRORLEVEL% equ 0 (
    call :log_warn "鍙戠幇杩愯涓殑 OpenChat 瀹瑰櫒"
    set "INSTALLED=true"
)

if exist ".env" (
    call :load_env
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_NAME% -c "SELECT 1" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        call :log_warn "鏁版嵁搴撳凡瀛樺湪 OpenChat 琛ㄧ粨鏋?
        set "INSTALLED=true"
    )
)

if "%INSTALLED%"=="true" (
    exit /b 0
) else (
    call :log_success "鏈娴嬪埌宸叉湁瀹夎"
    exit /b 1
)

:load_env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set "%%a=%%b"
)
exit /b 0

:handle_existing_installation
echo.
echo !BOLD!璇烽€夋嫨鎿嶄綔:!NC!
echo   1) 璺宠繃宸插畨瑁呴儴鍒嗭紝缁х画瀹夎
echo   2) 閲嶆柊瀹夎锛堜繚鐣欐暟鎹級
echo   3) 瀹屽叏閲嶆柊瀹夎锛堟竻闄ゆ暟鎹級
echo   4) 閫€鍑哄畨瑁?echo.
set /p "CHOICE=璇烽€夋嫨 [1-4]: "

if "%CHOICE%"=="1" (
    call :log_info "璺宠繃宸插畨瑁呴儴鍒嗭紝缁х画瀹夎..."
    exit /b 0
)
if "%CHOICE%"=="2" (
    call :log_info "鍑嗗閲嶆柊瀹夎锛堜繚鐣欐暟鎹級..."
    call :backup_data
    call :cleanup_installation false
    exit /b 0
)
if "%CHOICE%"=="3" (
    call :log_warn "璀﹀憡: 杩欏皢鍒犻櫎鎵€鏈夋暟鎹?"
    set /p "CONFIRM=纭瀹屽叏閲嶆柊瀹夎? (yes/no): "
    if "!CONFIRM!"=="yes" (
        call :log_info "鍑嗗瀹屽叏閲嶆柊瀹夎..."
        call :backup_data
        call :cleanup_installation true
        exit /b 0
    ) else (
        call :log_info "宸插彇娑?
        exit 1
    )
)
if "%CHOICE%"=="4" (
    call :log_info "閫€鍑哄畨瑁?
    exit 1
)
call :log_error "鏃犳晥閫夋嫨"
exit 1

:backup_data
call :log_step "澶囦唤鐜版湁鏁版嵁..."

set "BACKUP_TIME=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_TIME=!BACKUP_TIME: =0!"
set "BACKUP_PATH=%BACKUP_DIR%\backup_%BACKUP_TIME%"

if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

if exist ".env" (
    copy ".env" "%BACKUP_PATH%\.env" >nul
    call :log_success "澶囦唤 .env 鏂囦欢"
)

if exist "var\logs" (
    xcopy "var\logs" "%BACKUP_PATH%\logs\" /E /I /Q >nul
    call :log_success "澶囦唤鏃ュ織鏂囦欢"
)

call :log_success "澶囦唤瀹屾垚: %BACKUP_PATH%"
exit /b 0

:cleanup_installation
setlocal
set "FULL_CLEANUP=%~1"

call :log_step "娓呯悊鐜版湁瀹夎..."

docker ps -a --format "{{.Names}}" 2>nul | findstr "openchat" >nul
if %ERRORLEVEL% equ 0 (
    docker compose down -v 2>nul
    call :log_success "鍋滄 Docker 瀹瑰櫒"
)

if "%FULL_CLEANUP%"=="true" (
    if exist ".env" del ".env"
    if exist "docker-compose.override.yml" del "docker-compose.override.yml"
    call :log_success "鍒犻櫎閰嶇疆鏂囦欢"
    
    if exist "var\data" rd /s /q "var\data"
    if exist "var\logs" rd /s /q "var\logs"
    call :log_success "鍒犻櫎鏁版嵁鐩綍"
)

if exist "%INSTALL_STATE_FILE%" del "%INSTALL_STATE_FILE%"
endlocal
exit /b 0

:handle_error
setlocal
set "STEP=%~1"
set "ERROR=%~2"

call :log_error "瀹夎澶辫触: %ERROR%"
call :save_install_state "%STATE_FAILED%" "%STEP%" "%ERROR%"

echo.
echo !RED!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo !RED!鈺?                   瀹夎澶辫触                                   鈺?NC!
echo !RED!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo.
echo !BOLD!閿欒淇℃伅:!NC! %ERROR%
echo !BOLD!澶辫触姝ラ:!NC! %STEP%
echo.
echo !BOLD!鎭㈠閫夐」:!NC!
echo   1) 閲嶈瘯褰撳墠姝ラ
echo   2) 鏌ョ湅璇︾粏鏃ュ織
echo   3) 閫€鍑哄畨瑁?echo.
set /p "CHOICE=璇烽€夋嫨 [1-3]: "

if "%CHOICE%"=="1" (
    call :log_info "閲嶈瘯褰撳墠姝ラ..."
    exit /b 1
)
if "%CHOICE%"=="2" (
    echo.
    echo !BOLD!瀹夎鏃ュ織:!NC!
    type "%INSTALL_LOG_FILE%" | more
    echo.
    pause
    exit /b 1
)
call :log_info "閫€鍑哄畨瑁咃紝鍙◢鍚庨噸鏂拌繍琛岃剼鏈户缁?
exit 1

:step_check_environment
set "INSTALL_STEP=environment"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "妫€鏌ョ郴缁熺幆澧?.."

set "ERRORS="

docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set "ERRORS=!ERRORS! Docker 鏈畨瑁?
) else (
    docker info >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        set "ERRORS=!ERRORS! Docker 鏈嶅姟鏈繍琛?
    ) else (
        call :log_success "Docker 宸插畨瑁呭苟杩愯"
    )
)

docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    set "ERRORS=!ERRORS! Docker Compose 鏈畨瑁?
) else (
    call :log_success "Docker Compose 宸插畨瑁?
)

if not "!ERRORS!"=="" (
    call :log_error "鐜妫€鏌ュけ璐?!ERRORS!"
    call :handle_error "%INSTALL_STEP%" "鐜妫€鏌ュけ璐?
    exit /b !ERRORLEVEL!
)

call :log_success "鐜妫€鏌ラ€氳繃"
exit /b 0

:step_configure
set "INSTALL_STEP=config"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "閰嶇疆瀹夎鍙傛暟..."

echo.
echo !BOLD!閫夋嫨瀹夎鐜:!NC!
echo   1) 寮€鍙戠幆澧?(Development)
echo   2) 娴嬭瘯鐜 (Testing)
echo   3) 鐢熶骇鐜 (Production)
echo.
set /p "CHOICE=璇烽€夋嫨 [1-3, 榛樿 3]: "

if "%CHOICE%"=="" set "CHOICE=3"
if "%CHOICE%"=="1" set "ENV_NAME=development"
if "%CHOICE%"=="2" set "ENV_NAME=test"
if "%CHOICE%"=="3" set "ENV_NAME=production"

if not exist ".env" (
    copy ".env.%ENV_NAME%" ".env" >nul
    call :log_success "鍒涘缓 .env 閰嶇疆鏂囦欢"
) else (
    call :log_warn ".env 宸插瓨鍦紝璺宠繃鍒涘缓"
)

rem 鑾峰彇鏈嶅姟鍣?IP
for /f "tokens=*" %%a in ('curl -s -4 --connect-timeout 5 ifconfig.me 2^>nul') do set "EXTERNAL_IP=%%a"
if "!EXTERNAL_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "EXTERNAL_IP=%%a"
        set "EXTERNAL_IP=!EXTERNAL_IP: =!"
        goto :got_ip
    )
)
:got_ip
set /p "CONFIRM_IP=鏈嶅姟鍣ㄥ缃?IP [!EXTERNAL_IP!]: "
if not "!CONFIRM_IP!"=="" set "EXTERNAL_IP=!CONFIRM_IP!"

powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"

rem 鐢熸垚 JWT 瀵嗛挜
for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String((1..32 ^| ForEach-Object { Get-Random -Maximum 256 }))"') do set "JWT_SECRET=%%a"
powershell -Command "(Get-Content .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Set-Content .env"

call :log_success "閰嶇疆瀹屾垚"
exit /b 0

:step_start_services
set "INSTALL_STEP=services"
call :save_install_state "%STATE_INSTALLING%" "%INSTALL_STEP%" ""

call :log_step "鍚姩鏈嶅姟..."

call :log_info "鎷夊彇 Docker 闀滃儚..."
docker compose pull
if %ERRORLEVEL% neq 0 (
    call :handle_error "%INSTALL_STEP%" "闀滃儚鎷夊彇澶辫触"
    exit /b !ERRORLEVEL!
)

call :log_info "鍚姩 Docker 鏈嶅姟..."
docker compose up -d
if %ERRORLEVEL% neq 0 (
    call :handle_error "%INSTALL_STEP%" "鏈嶅姟鍚姩澶辫触"
    exit /b !ERRORLEVEL!
)

call :log_info "绛夊緟鏈嶅姟灏辩华..."
set /a WAITED=0
set /a MAX_WAIT=120

:wait_loop
if %WAITED% geq %MAX_WAIT% (
    call :handle_error "%INSTALL_STEP%" "鏈嶅姟鍚姩瓒呮椂"
    exit /b !ERRORLEVEL!
)

curl -s http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call :log_success "鏈嶅姟鍚姩鎴愬姛"
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

call :log_step "楠岃瘉瀹夎..."

curl -s http://localhost:3000/health | findstr "ok" >nul
if %ERRORLEVEL% equ 0 (
    call :log_success "API 鏈嶅姟姝ｅ父"
) else (
    call :log_error "API 鏈嶅姟寮傚父"
    call :handle_error "%INSTALL_STEP%" "楠岃瘉澶辫触"
    exit /b !ERRORLEVEL!
)

exit /b 0

:show_install_result
call :load_env

echo.
echo !GREEN!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo !GREEN!鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?NC!
echo !GREEN!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo.
echo !BOLD!鏈嶅姟璁块棶鍦板潃:!NC!
echo   鈥?OpenChat API:    http://%EXTERNAL_IP%:3000
echo   鈥?API 鏂囨。:        http://%EXTERNAL_IP%:3000/im/v3/docs
echo   鈥?鍋ュ悍妫€鏌?        http://%EXTERNAL_IP%:3000/health
echo.
echo !BOLD!甯哥敤鍛戒护:!NC!
echo   鈥?鏌ョ湅鏃ュ織:    docker compose logs -f
echo   鈥?鍋滄鏈嶅姟:    docker compose down
echo   鈥?閲嶅惎鏈嶅姟:    docker compose restart
echo.
echo !YELLOW!瀹夊叏鎻愮ず:!NC!
echo   鈿狅笍  璇峰Ε鍠勪繚绠?.env 鏂囦欢涓殑瀵嗙爜鍜屽瘑閽?echo   鈿狅笍  鐢熶骇鐜寤鸿鍚敤 HTTPS
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
    call :log_warn "妫€娴嬪埌涓婃瀹夎澶辫触"
    call :log_info "澶辫触姝ラ: %INSTALL_STEP%"
    call :log_info "閿欒淇℃伅: %LAST_ERROR%"
    echo.
    set /p "CONTINUE=鏄惁浠庡け璐ュ缁х画瀹夎? (Y/n): "
    if /i "!CONTINUE!"=="n" (
        set "CURRENT_STATE=%STATE_NOT_INSTALLED%"
    )
)

rem 鎵ц瀹夎姝ラ
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

