@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 启动脚本
rem 版本: 1.0.0
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=1.0.0"
set "APP_HOME=%~dp0.."
set "CONFIG_FILE=%APP_HOME%\etc\config.json"
set "PID_FILE=%APP_HOME%\var\run\openchat.pid"
set "LOG_DIR=%APP_HOME%\var\logs"
set "DATA_DIR=%APP_HOME%\var\data"

rem 默认配置
set "NODE_ENV=production"
set "PORT=3000"
set "HOST=0.0.0.0"

rem 解析参数
if "%~1"=="" goto :usage

:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="start" goto :start
if /i "%~1"=="stop" goto :stop
if /i "%~1"=="restart" goto :restart
if /i "%~1"=="status" goto :status
if /i "%~1"=="console" goto :console
if /i "%~1"=="help" goto :usage
shift
goto :parse_args

:end_parse
goto :usage

rem ============================================
rem 启动服务（后台模式）
rem ============================================
:start
call :check_node
call :check_running
if %ERRORLEVEL% neq 0 (
    echo [%APP_NAME%] 服务已经在运行中
    exit /b 1
)

echo [%APP_NAME%] 正在启动...

rem 创建必要的目录
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

rem 设置环境变量
set "OPENCHAT_HOME=%APP_HOME%"
set "OPENCHAT_CONFIG=%CONFIG_FILE%"
set "OPENCHAT_LOG_DIR=%LOG_DIR%"
set "OPENCHAT_DATA_DIR=%DATA_DIR%"

rem 启动服务（使用 start 命令后台运行）
start /b "OpenChat" cmd /c "cd /d "%APP_HOME%" && node dist/main.js > "%LOG_DIR%\stdout.log" 2>&1"

rem 记录 PID
for /f "tokens=2" %%a in ('tasklist ^| findstr "node.exe"') do (
    echo %%a > "%PID_FILE%"
    echo [%APP_NAME%] 服务已启动，PID: %%a
    goto :start_done
)

:start_done
echo [%APP_NAME%] 日志文件: %LOG_DIR%\stdout.log
goto :eof

rem ============================================
rem 停止服务
rem ============================================
:stop
echo [%APP_NAME%] 正在停止服务...

if not exist "%PID_FILE%" (
    echo [%APP_NAME%] 未找到 PID 文件，尝试查找进程...
    taskkill /f /im node.exe 2>nul
    echo [%APP_NAME%] 服务已停止
    goto :eof
)

set /p PID=<"%PID_FILE%"
echo [%APP_NAME%] 停止进程 PID: %PID%

taskkill /f /pid %PID% 2>nul
if %ERRORLEVEL% equ 0 (
    del "%PID_FILE%" 2>nul
    echo [%APP_NAME%] 服务已停止
) else (
    echo [%APP_NAME%] 停止服务失败，尝试强制停止...
    taskkill /f /im node.exe 2>nul
    del "%PID_FILE%" 2>nul
    echo [%APP_NAME%] 服务已强制停止
)
goto :eof

rem ============================================
rem 重启服务
rem ============================================
:restart
call :stop
timeout /t 2 /nobreak >nul
call :start
goto :eof

rem ============================================
rem 查看状态
rem ============================================
:status
call :check_running
if %ERRORLEVEL% equ 0 (
    echo [%APP_NAME%] 服务状态: 未运行
) else (
    set /p PID=<"%PID_FILE%"
    echo [%APP_NAME%] 服务状态: 运行中
    echo [%APP_NAME%] 进程 PID: !PID!
)
goto :eof

rem ============================================
rem 前台运行（调试模式）
rem ============================================
:console
call :check_node
echo [%APP_NAME%] 以前台模式启动（按 Ctrl+C 停止）...
cd /d "%APP_HOME%"
set "NODE_ENV=development"
node dist/main.js
goto :eof

rem ============================================
rem 检查 Node.js
rem ============================================
:check_node
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    exit /b 1
)
goto :eof

rem ============================================
rem 检查服务是否运行
rem ============================================
:check_running
if not exist "%PID_FILE%" exit /b 0
set /p PID=<"%PID_FILE%"
tasklist /fi "pid eq %PID%" 2>nul | findstr "%PID%" >nul
if %ERRORLEVEL% equ 0 exit /b 1
exit /b 0

rem ============================================
rem 使用说明
rem ============================================
:usage
echo.
echo ============================================
echo  %APP_NAME% v%APP_VERSION%
echo ============================================
echo.
echo 用法: openchat.bat [命令]
echo.
echo 命令:
echo   start     启动服务（后台模式）
echo   stop      停止服务
echo   restart   重启服务
echo   status    查看服务状态
echo   console   前台运行（调试模式）
echo   help      显示帮助信息
echo.
echo 示例:
echo   openchat.bat start
echo   openchat.bat stop
echo   openchat.bat restart
echo.
goto :eof
