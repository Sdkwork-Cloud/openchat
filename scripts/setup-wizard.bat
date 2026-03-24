@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 鏅鸿兘瀹夎鍚戝
rem 鏀寔澶氱瀹夎鍦烘櫙
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"

rem ANSI 棰滆壊鏀寔
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=!ESC![31m"
set "GREEN=!ESC![32m"
set "YELLOW=!ESC![33m"
set "BLUE=!ESC![34m"
set "CYAN=!ESC![36m"
set "BOLD=!ESC![1m"
set "NC=!ESC![0m"

rem 瀹夎閰嶇疆
set "INSTALL_ENV=production"
set "INSTALL_MODE=docker"
set "USE_EXISTING_DB=false"
set "USE_EXISTING_REDIS=false"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_USERNAME=openchat"
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
echo  !BOLD!鈺?                    鏅鸿兘瀹夎鍚戝 v%APP_VERSION%                      鈺?NC!
echo  !BOLD!鈺?                                                              鈺?NC!
echo  !BOLD!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo.
exit /b 0

:log_info
echo !BLUE![INFO]!NC! %~1
exit /b 0

:log_success
echo !GREEN![鉁揮!NC! %~1
exit /b 0

:log_warn
echo !YELLOW![!]!NC! %~1
exit /b 0

:log_error
echo !RED![鉁梋!NC! %~1
exit /b 0

:log_step
echo !CYAN![STEP]!NC! %~1
exit /b 0

:log_ask
set /p "ANSWER=!YELLOW![?]!NC! %~1"
exit /b 0

:select_environment
echo.
echo !BOLD!璇烽€夋嫨瀹夎鐜:!NC!
echo   1) 寮€鍙戠幆澧?(Development)
echo   2) 娴嬭瘯鐜 (Testing)
echo   3) 鐢熶骇鐜 (Production)
echo.
set /p "CHOICE=璇烽€夋嫨 [1-3, 榛樿 3]: "

if "%CHOICE%"=="" set "CHOICE=3"
if "%CHOICE%"=="1" set "INSTALL_ENV=development"
if "%CHOICE%"=="2" set "INSTALL_ENV=test"
if "%CHOICE%"=="3" set "INSTALL_ENV=production"

call :log_success "閫夋嫨鐜: %INSTALL_ENV%"
exit /b 0

:select_install_mode
echo.
echo !BOLD!璇烽€夋嫨瀹夎妯″紡:!NC!
echo   1) Docker Compose锛堟帹鑽愶紝鑷姩绠＄悊鎵€鏈変緷璧栵級
echo   2) 鐙珛鏈嶅姟锛堜娇鐢ㄥ凡鏈夋暟鎹簱鍜?Redis锛?echo   3) 娣峰悎妯″紡锛堜娇鐢ㄥ凡鏈夋暟鎹簱锛孌ocker 绠＄悊 Redis锛?echo   4) 娣峰悎妯″紡锛堜娇鐢ㄥ凡鏈?Redis锛孌ocker 绠＄悊鏁版嵁搴擄級
echo.
set /p "CHOICE=璇烽€夋嫨 [1-4, 榛樿 1]: "

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

call :log_success "閫夋嫨妯″紡: %INSTALL_MODE%"
exit /b 0

:configure_existing_database
echo.
echo !BOLD!閰嶇疆宸叉湁鏁版嵁搴撹繛鎺?!NC!

set /p "DB_HOST=鏁版嵁搴撲富鏈哄湴鍧€ [localhost]: "
if "%DB_HOST%"=="" set "DB_HOST=localhost"

set /p "DB_PORT=鏁版嵁搴撶鍙?[5432]: "
if "%DB_PORT%"=="" set "DB_PORT=5432"

set /p "DB_NAME=鏁版嵁搴撳悕绉?[openchat]: "
if "%DB_NAME%"=="" set "DB_NAME=openchat"

set /p "DB_USERNAME=鏁版嵁搴撶敤鎴峰悕: "
set /p "DB_PASSWORD=鏁版嵁搴撳瘑鐮? "

call :log_info "娴嬭瘯鏁版嵁搴撹繛鎺?.."
psql -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USERNAME%" -d "%DB_NAME%" -c "SELECT 1" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "鏁版嵁搴撹繛鎺ュけ璐ワ紝璇锋鏌ラ厤缃?
    exit /b 1
)
call :log_success "鏁版嵁搴撹繛鎺ユ垚鍔?
exit /b 0

:configure_existing_redis
echo.
echo !BOLD!閰嶇疆宸叉湁 Redis 杩炴帴:!NC!

set /p "REDIS_HOST=Redis 涓绘満鍦板潃 [localhost]: "
if "%REDIS_HOST%"=="" set "REDIS_HOST=localhost"

set /p "REDIS_PORT=Redis 绔彛 [6379]: "
if "%REDIS_PORT%"=="" set "REDIS_PORT=6379"

set /p "REDIS_PASSWORD=Redis 瀵嗙爜 (鏃犲瘑鐮佽鐣欑┖): "

call :log_info "娴嬭瘯 Redis 杩炴帴..."
if "%REDIS_PASSWORD%"=="" (
    redis-cli -h "%REDIS_HOST%" -p "%REDIS_PORT%" ping >nul 2>&1
) else (
    redis-cli -h "%REDIS_HOST%" -p "%REDIS_PORT%" -a "%REDIS_PASSWORD%" ping >nul 2>&1
)
if %ERRORLEVEL% neq 0 (
    call :log_error "Redis 杩炴帴澶辫触锛岃妫€鏌ラ厤缃?
    exit /b 1
)
call :log_success "Redis 杩炴帴鎴愬姛"
exit /b 0

:get_server_ip
call :log_step "鑾峰彇鏈嶅姟鍣?IP 鍦板潃..."

rem 灏濊瘯鑾峰彇澶栫綉 IP
for /f "tokens=*" %%a in ('curl -s -4 --connect-timeout 5 ifconfig.me 2^>nul') do set "EXTERNAL_IP=%%a"

if "!EXTERNAL_IP!"=="" (
    rem 鑾峰彇鍐呯綉 IP
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        set "EXTERNAL_IP=%%a"
        set "EXTERNAL_IP=!EXTERNAL_IP: =!"
        goto :got_ip
    )
)

:got_ip
set /p "CONFIRM_IP=璇疯緭鍏ユ湇鍔″櫒澶栫綉 IP [!EXTERNAL_IP!]: "
if not "!CONFIRM_IP!"=="" set "EXTERNAL_IP=!CONFIRM_IP!"

call :log_success "鏈嶅姟鍣?IP: %EXTERNAL_IP%"
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
call :log_step "鍒涘缓鐜閰嶇疆鏂囦欢..."

if "%INSTALL_ENV%"=="development" (
    copy ".env.development" ".env" >nul
) else if "%INSTALL_ENV%"=="test" (
    copy ".env.test" ".env" >nul
) else (
    copy ".env.production" ".env" >nul
)

rem 鏇存柊閰嶇疆
powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_HOST=.*', 'DB_HOST=%DB_HOST%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PORT=.*', 'DB_PORT=%DB_PORT%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_USERNAME=.*', 'DB_USERNAME=%DB_USERNAME%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'DB_NAME=.*', 'DB_NAME=%DB_NAME%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_HOST=.*', 'REDIS_HOST=%REDIS_HOST%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_PORT=.*', 'REDIS_PORT=%REDIS_PORT%' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'REDIS_PASSWORD=.*', 'REDIS_PASSWORD=%REDIS_PASSWORD%' | Set-Content .env"

call :generate_jwt_secret JWT_SECRET
powershell -Command "(Get-Content .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Set-Content .env"

call :log_success "鐜閰嶇疆鏂囦欢鍒涘缓瀹屾垚"
exit /b 0

:create_docker_compose_config
call :log_step "鍒涘缓 Docker Compose 閰嶇疆..."

if "%USE_EXISTING_DB%"=="true" if "%USE_EXISTING_REDIS%"=="true" (
    (
        echo # OpenChat Docker Compose 瑕嗙洊閰嶇疆
        echo # 浣跨敤宸叉湁鏁版嵁搴撳拰 Redis
        echo version: '3.8'
        echo.
        echo services:
        echo   app:
        echo     environment:
        echo       - DB_HOST=%DB_HOST%
        echo       - DB_PORT=%DB_PORT%
        echo       - DB_USERNAME=%DB_USERNAME%
        echo       - DB_PASSWORD=%DB_PASSWORD%
        echo       - DB_NAME=%DB_NAME%
        echo       - REDIS_HOST=%REDIS_HOST%
        echo       - REDIS_PORT=%REDIS_PORT%
        echo       - REDIS_PASSWORD=%REDIS_PASSWORD%
        echo     extra_hosts:
        echo       - "host.docker.internal:host-gateway"
    ) > docker-compose.override.yml
)

call :log_success "Docker Compose 閰嶇疆鍒涘缓瀹屾垚"
exit /b 0

:start_services
call :log_step "鍚姩鏈嶅姟..."

if "%INSTALL_MODE%"=="docker" (
    call :log_info "鎷夊彇 Docker 闀滃儚..."
    docker compose pull
    
    call :log_info "鍚姩 Docker 鏈嶅姟..."
    docker compose up -d
    
    call :log_info "绛夊緟鏈嶅姟灏辩华..."
    timeout /t 10 >nul
    
    docker compose ps | findstr "Up" >nul
    if %ERRORLEVEL% neq 0 (
        call :log_error "鏈嶅姟鍚姩澶辫触锛岃妫€鏌ユ棩蹇?
        docker compose logs
        exit /b 1
    )
    call :log_success "鏈嶅姟鍚姩鎴愬姛"
)

exit /b 0

:show_install_result
echo.
echo !GREEN!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo !GREEN!鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?NC!
echo !GREEN!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?NC!
echo.
echo !BOLD!瀹夎淇℃伅:!NC!
echo   鈥?瀹夎鐜: %INSTALL_ENV%
echo   鈥?瀹夎妯″紡: %INSTALL_MODE%
echo   鈥?鏁版嵁搴? %DB_HOST%:%DB_PORT%/%DB_NAME%
echo   鈥?Redis: %REDIS_HOST%:%REDIS_PORT%
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
rem 閫夋嫨瀹夎鐜
call :select_environment

rem 閫夋嫨瀹夎妯″紡
call :select_install_mode

rem 閰嶇疆鏁版嵁搴?if "%USE_EXISTING_DB%"=="true" (
    call :configure_existing_database
)

rem 閰嶇疆 Redis
if "%USE_EXISTING_REDIS%"=="true" (
    call :configure_existing_redis
)

rem 璁剧疆榛樿鍊?if "%USE_EXISTING_DB%"=="false" (
    set "DB_HOST=postgres"
    set "DB_USERNAME=openchat"
    call :generate_password DB_PASSWORD
    set "DB_NAME=openchat"
)

if "%USE_EXISTING_REDIS%"=="false" (
    set "REDIS_HOST=redis"
    call :generate_password REDIS_PASSWORD
)

rem 鑾峰彇鏈嶅姟鍣?IP
call :get_server_ip

rem 鍒涘缓閰嶇疆鏂囦欢
call :create_env_file
call :create_docker_compose_config

rem 鍚姩鏈嶅姟
call :start_services

rem 鏄剧ず缁撴灉
call :show_install_result
exit /b 0

