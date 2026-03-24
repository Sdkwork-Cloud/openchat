@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 涓€閿畨瑁呰剼鏈?rem 鐗堟湰: 2.0.0
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=2.0.0"
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

rem 棰滆壊浠ｇ爜
for /f %%i in ('echo prompt $E^| cmd') do set "ESC=%%i"
set "RED=!ESC![91m"
set "GREEN=!ESC![92m"
set "YELLOW=!ESC![93m"
set "BLUE=!ESC![94m"
set "CYAN=!ESC![96m"
set "RESET=!ESC![0m"

rem 涓诲叆鍙?if "%~1"=="" goto :interactive
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
rem 鏄剧ず妯箙
rem ============================================
:show_banner
cls
echo.
echo !CYAN!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?RESET!
echo !CYAN!鈺?                                                              鈺?RESET!
echo !CYAN!鈺?  鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈺?      鈺?RESET!
echo !CYAN!鈺? 鈻堚枅鈺斺晲鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺愨晲鈺濃枅鈻堚晹鈺愨晲鈻堚枅鈺椻暁鈺愨晲鈻堚枅鈺斺晲鈺愨暆鈻堚枅鈺斺晲鈺愨枅鈻堚晽鈻堚枅鈺?      鈺?RESET!
echo !CYAN!鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚枅鈻堚枅鈺? 鈻堚枅鈻堚枅鈻堚枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈻堚枅鈻堚枅鈻堚晳鈻堚枅鈺?      鈺?RESET!
echo !CYAN!鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺? 鈻堚枅鈺斺晲鈺愨枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈺斺晲鈺愨枅鈻堚晳鈻堚枅鈺?      鈺?RESET!
echo !CYAN!鈺? 鈺氣枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚晳  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺椻枅鈻堚晳  鈻堚枅鈺?  鈻堚枅鈺?  鈻堚枅鈺? 鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺? 鈺?RESET!
echo !CYAN!鈺?  鈺氣晲鈺愨晲鈺愨晲鈺?鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺濃暁鈺愨暆  鈺氣晲鈺?  鈺氣晲鈺?  鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺? 鈺?RESET!
echo !CYAN!鈺?                                                              鈺?RESET!
echo !CYAN!鈺?          Open Source Instant Messaging Platform              鈺?RESET!
echo !CYAN!鈺?                    Version %APP_VERSION%                           鈺?RESET!
echo !CYAN!鈺?                                                              鈺?RESET!
echo !CYAN!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?RESET!
echo.
goto :eof

rem ============================================
rem 浜や簰寮忓畨瑁?rem ============================================
:interactive
call :show_banner
echo !BLUE![INFO]!RESET! 寮€濮嬩氦浜掑紡瀹夎...
echo.

rem 妫€鏌?Docker
echo !BLUE![STEP]!RESET! 妫€鏌ョ郴缁熶緷璧?..
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 鏈壘鍒?Docker锛岃鍏堝畨瑁?Docker Desktop
    echo !YELLOW![INFO]!RESET! 涓嬭浇鍦板潃: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! Docker 宸插畨瑁?
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 鏈壘鍒?Docker Compose
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! Docker Compose 宸插畨瑁?
rem 妫€鏌ョ鍙ｅ啿绐?echo.
echo !BLUE![STEP]!RESET! 妫€鏌ョ鍙ｅ啿绐?..
set "PORT_CONFLICT=0"
for %%p in (3000 5432 6379 5001 5100 5200 5300) do (
    netstat -ano | findstr ":%%p " >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo !YELLOW![WARN]!RESET! 绔彛 %%p 宸茶鍗犵敤
        set "PORT_CONFLICT=1"
    )
)
if "%PORT_CONFLICT%"=="1" (
    echo.
    echo !YELLOW![WARN]!RESET! 妫€娴嬪埌绔彛鍐茬獊锛屾偍鍙互:
    echo   1. 鍋滄鍗犵敤绔彛鐨勬湇鍔?    echo   2. 淇敼 .env 鏂囦欢涓殑绔彛閰嶇疆
    echo.
    set /p CONTINUE="鏄惁缁х画瀹夎? (y/N): "
    if /i not "!CONTINUE!"=="y" exit /b 1
) else (
    echo !GREEN![SUCCESS]!RESET! 绔彛妫€鏌ラ€氳繃
)

rem 閫夋嫨鐜
echo.
echo !BLUE![INFO]!RESET! 璇烽€夋嫨閮ㄧ讲鐜:
echo   1. 寮€鍙戠幆澧?^(development^)
echo   2. 娴嬭瘯鐜 ^(test^)
echo   3. 鐢熶骇鐜 ^(production^)
echo.
set /p ENV_CHOICE="璇疯緭鍏ラ€夐」 [1-3锛岄粯璁?]: "

if "%ENV_CHOICE%"=="" set ENV_CHOICE=1
if "%ENV_CHOICE%"=="1" set "ENV=development"
if "%ENV_CHOICE%"=="2" set "ENV=test"
if "%ENV_CHOICE%"=="3" set "ENV=production"

echo !GREEN![SUCCESS]!RESET! 宸查€夋嫨: %ENV% 鐜

rem 鑾峰彇鏈嶅姟鍣?IP
echo.
echo !BLUE![INFO]!RESET! 妫€娴嬫湇鍔″櫒 IP 鍦板潃...

rem 灏濊瘯鑾峰彇澶栫綉 IP
for /f "delims=" %%i in ('curl -s --connect-timeout 5 https://api.ipify.org 2^>nul') do set EXTERNAL_IP=%%i

if "%EXTERNAL_IP%"=="" (
    rem 鑾峰彇鍐呯綉 IP
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
        for /f "tokens=1,2 delims= " %%b in ("%%a") do set EXTERNAL_IP=%%b
    )
)

echo !GREEN![SUCCESS]!RESET! 妫€娴嬪埌 IP: %EXTERNAL_IP%
set /p CONFIRM_IP="璇风‘璁ゆ湇鍔″櫒 IP [%EXTERNAL_IP%]: "
if not "%CONFIRM_IP%"=="" set EXTERNAL_IP=%CONFIRM_IP%

rem 閰嶇疆鐜鍙橀噺
echo.
echo !BLUE![STEP]!RESET! 閰嶇疆鐜鍙橀噺...

cd /d "%PROJECT_ROOT%"

if exist ".env" (
    echo !YELLOW![WARN]!RESET! .env 鏂囦欢宸插瓨鍦紝璺宠繃閰嶇疆
) else (
    if exist ".env.%ENV%" (
        copy ".env.%ENV%" ".env" >nul
    ) else if exist ".env.example" (
        copy ".env.example" ".env" >nul
    )
    
    rem 鏇存柊 EXTERNAL_IP
    if exist ".env" (
        powershell -Command "(Get-Content .env) -replace 'EXTERNAL_IP=.*', 'EXTERNAL_IP=%EXTERNAL_IP%' | Set-Content .env"
    )
    
    echo !GREEN![SUCCESS]!RESET! 鐜鍙橀噺閰嶇疆瀹屾垚
)

rem 鍒涘缓鐩綍
echo.
echo !BLUE![STEP]!RESET! 鍒涘缓鐩綍缁撴瀯...
if not exist "var\logs" mkdir "var\logs"
if not exist "var\data" mkdir "var\data"
if not exist "var\run" mkdir "var\run"
if not exist "backups" mkdir "backups"
echo !GREEN![SUCCESS]!RESET! 鐩綍缁撴瀯鍒涘缓瀹屾垚

rem 鎷夊彇闀滃儚
echo.
echo !BLUE![STEP]!RESET! 鎷夊彇 Docker 闀滃儚...
echo !YELLOW![INFO]!RESET! 杩欏彲鑳介渶瑕佸嚑鍒嗛挓锛岃鑰愬績绛夊緟...
docker compose pull
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 闀滃儚鎷夊彇澶辫触
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! 闀滃儚鎷夊彇瀹屾垚

rem 鍚姩鏈嶅姟
echo.
echo !BLUE![STEP]!RESET! 鍚姩鏈嶅姟...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo !RED![ERROR]!RESET! 鏈嶅姟鍚姩澶辫触
    pause
    exit /b 1
)
echo !GREEN![SUCCESS]!RESET! 鏈嶅姟鍚姩瀹屾垚

rem 绛夊緟鏈嶅姟灏辩华
echo.
echo !BLUE![INFO]!RESET! 绛夊緟鏈嶅姟灏辩华...
set /a ATTEMPTS=0
:wait_loop
curl -sf http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto :service_ready
set /a ATTEMPTS+=1
if %ATTEMPTS% geq 60 (
    echo !RED![ERROR]!RESET! 鏈嶅姟鍚姩瓒呮椂
    goto :show_logs_hint
)
timeout /t 2 /nobreak >nul
echo|set /p="."
goto :wait_loop

:service_ready
echo.
echo !GREEN![SUCCESS]!RESET! OpenChat 鏈嶅姟宸插氨缁?
rem 鏄剧ず璁块棶淇℃伅
echo.
echo !GREEN!鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?RESET!
echo !GREEN!鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺?RESET!
echo !GREEN!鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?RESET!
echo.
echo 鏈嶅姟璁块棶鍦板潃:
echo   鈥?OpenChat API:    http://%EXTERNAL_IP%:3000
echo   鈥?API 鏂囨。:        http://%EXTERNAL_IP%:3000/im/v3/docs
echo   鈥?鍋ュ悍妫€鏌?        http://%EXTERNAL_IP%:3000/health
echo   鈥?鎮熺┖IM Demo:     http://%EXTERNAL_IP%:5172
echo   鈥?鎮熺┖IM 绠＄悊鍚庡彴: http://%EXTERNAL_IP%:5300/web
echo.
echo 甯哥敤鍛戒护:
echo   鈥?鏌ョ湅鏃ュ織:    docker compose logs -f
echo   鈥?鍋滄鏈嶅姟:    docker compose down
echo   鈥?閲嶅惎鏈嶅姟:    docker compose restart
echo   鈥?鏌ョ湅鐘舵€?    docker compose ps
echo.
echo !YELLOW!瀹夊叏鎻愮ず:!RESET!
echo   鈿狅笍  鐢熶骇鐜璇蜂慨鏀?.env 鏂囦欢涓殑榛樿瀵嗙爜
echo   鈿狅笍  寤鸿閰嶇疆闃茬伀澧欙紝闄愬埗鏁版嵁搴撶鍙ｄ粎鍐呯綉璁块棶
echo.
goto :eof

:show_logs_hint
echo.
echo !YELLOW![INFO]!RESET! 鏌ョ湅鏃ュ織: docker compose logs -f
pause
exit /b 1

rem ============================================
rem 瀹夎鍛戒护
rem ============================================
:install
call :show_banner
echo !BLUE![INFO]!RESET! 鎵ц瀹夎...
goto :interactive

rem ============================================
rem 鍚姩鏈嶅姟
rem ============================================
:start
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 鍚姩鏈嶅姟...
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 鏈嶅姟宸插惎鍔?goto :eof

rem ============================================
rem 鍋滄鏈嶅姟
rem ============================================
:stop
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 鍋滄鏈嶅姟...
docker compose down
echo !GREEN![SUCCESS]!RESET! 鏈嶅姟宸插仠姝?goto :eof

rem ============================================
rem 閲嶅惎鏈嶅姟
rem ============================================
:restart
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 閲嶅惎鏈嶅姟...
docker compose down
timeout /t 2 /nobreak >nul
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 鏈嶅姟宸查噸鍚?goto :eof

rem ============================================
rem 鏌ョ湅鐘舵€?rem ============================================
:status
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 鏈嶅姟鐘舵€?
docker compose ps
echo.
echo !BLUE![INFO]!RESET! 璧勬簮浣跨敤:
docker stats --no-stream
goto :eof

rem ============================================
rem 鏌ョ湅鏃ュ織
rem ============================================
:logs
cd /d "%PROJECT_ROOT%"
docker compose logs -f %2
goto :eof

rem ============================================
rem 娓呯悊鏁版嵁
rem ============================================
:clean
cd /d "%PROJECT_ROOT%"
echo !RED![WARN]!RESET! 杩欏皢鍒犻櫎鎵€鏈夋暟鎹?
set /p CONFIRM="纭娓呯悊鎵€鏈夋暟鎹? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo !YELLOW![INFO]!RESET! 宸插彇娑?    goto :eof
)
echo !BLUE![INFO]!RESET! 娓呯悊鏁版嵁...
docker compose down -v
del /q "var\logs\*" 2>nul
del /q "var\data\*" 2>nul
echo !GREEN![SUCCESS]!RESET! 鏁版嵁宸叉竻鐞?goto :eof

rem ============================================
rem 鏇存柊鏈嶅姟
rem ============================================
:update
cd /d "%PROJECT_ROOT%"
echo !BLUE![INFO]!RESET! 鏇存柊鏈嶅姟...
docker compose pull
docker compose build
docker compose down
docker compose up -d
echo !GREEN![SUCCESS]!RESET! 鏇存柊瀹屾垚
goto :eof

rem ============================================
rem 鍗歌浇
rem ============================================
:uninstall
cd /d "%PROJECT_ROOT%"
echo !RED![WARN]!RESET! 杩欏皢鍗歌浇 OpenChat!
set /p CONFIRM="纭鍗歌浇? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo !YELLOW![INFO]!RESET! 宸插彇娑?    goto :eof
)
echo !BLUE![INFO]!RESET! 鍗歌浇 OpenChat...
docker compose down -v
echo !GREEN![SUCCESS]!RESET! 鍗歌浇瀹屾垚
goto :eof

rem ============================================
rem 甯姪
rem ============================================
:help
call :show_banner
echo 鐢ㄦ硶: %~nx0 [鍛戒护]
echo.
echo 鍛戒护:
echo   install     瀹夎 OpenChat (浜や簰寮?
echo   start       鍚姩鏈嶅姟
echo   stop        鍋滄鏈嶅姟
echo   restart     閲嶅惎鏈嶅姟
echo   status      鏌ョ湅鏈嶅姟鐘舵€?echo   logs        鏌ョ湅鏃ュ織
echo   clean       娓呯悊鎵€鏈夋暟鎹?echo   update      鏇存柊鏈嶅姟
echo   uninstall   鍗歌浇 OpenChat
echo   help        鏄剧ず甯姪
echo.
echo 绀轰緥:
echo   %~nx0              # 浜や簰寮忓畨瑁?echo   %~nx0 start        # 鍚姩鏈嶅姟
echo   %~nx0 logs app     # 鏌ョ湅搴旂敤鏃ュ織
echo.
goto :eof

