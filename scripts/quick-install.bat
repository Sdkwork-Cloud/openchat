@echo off
chcp 65001 >nul

rem ============================================
rem OpenChat - Windows 蹇€熷畨瑁呰剼鏈?rem 鐗堟湰: 2.0.0
rem ============================================

echo.
echo 鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?echo 鈺?                  OpenChat 蹇€熷畨瑁?                         鈺?echo 鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?echo.

rem 妫€鏌?Docker
echo [1/5] 妫€鏌?Docker...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [閿欒] 鏈壘鍒?Docker锛岃鍏堝畨瑁?Docker Desktop
    echo 涓嬭浇鍦板潃: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [鎴愬姛] Docker 宸插畨瑁?
rem 妫€鏌?Docker Compose
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [閿欒] 鏈壘鍒?Docker Compose
    pause
    exit /b 1
)
echo [鎴愬姛] Docker Compose 宸插畨瑁?
rem 閰嶇疆鐜
echo.
echo [2/5] 閰嶇疆鐜...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [鎴愬姛] 宸插垱寤?.env 閰嶇疆鏂囦欢
    ) else (
        echo [璀﹀憡] 鏈壘鍒?.env.example锛岃鎵嬪姩鍒涘缓 .env 鏂囦欢
    )
) else (
    echo [璺宠繃] .env 鏂囦欢宸插瓨鍦?)

rem 鍒涘缓鐩綍
echo.
echo [3/5] 鍒涘缓鐩綍...
if not exist "var\logs" mkdir "var\logs"
if not exist "var\data" mkdir "var\data"
echo [鎴愬姛] 鐩綍鍒涘缓瀹屾垚

rem 鎷夊彇闀滃儚
echo.
echo [4/5] 鎷夊彇闀滃儚 (鍙兘闇€瑕佸嚑鍒嗛挓)...
docker compose -f docker-compose.quick.yml pull
if %ERRORLEVEL% neq 0 (
    echo [閿欒] 闀滃儚鎷夊彇澶辫触
    pause
    exit /b 1
)
echo [鎴愬姛] 闀滃儚鎷夊彇瀹屾垚

rem 鍚姩鏈嶅姟
echo.
echo [5/5] 鍚姩鏈嶅姟...
docker compose -f docker-compose.quick.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [閿欒] 鏈嶅姟鍚姩澶辫触
    pause
    exit /b 1
)
echo [鎴愬姛] 鏈嶅姟鍚姩瀹屾垚

rem 绛夊緟鏈嶅姟灏辩华
echo.
echo 绛夊緟鏈嶅姟灏辩华...
:wait_loop
curl -sf http://localhost:3000/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto :ready
timeout /t 2 /nobreak >nul
echo|set /p="."
goto :wait_loop

:ready
echo.
echo.
echo 鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?echo 鈺?                   瀹夎鎴愬姛锛?                               鈺?echo 鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?echo.
echo 璁块棶鍦板潃:
echo   鈥?OpenChat API:    http://localhost:3000
echo   鈥?API 鏂囨。:        http://localhost:3000/im/v3/docs
echo   鈥?鎮熺┖IM Demo:     http://localhost:5172
echo.
echo 甯哥敤鍛戒护:
echo   鈥?鏌ョ湅鏃ュ織:    docker compose logs -f
echo   鈥?鍋滄鏈嶅姟:    docker compose down
echo   鈥?閲嶅惎鏈嶅姟:    docker compose restart
echo.
pause

