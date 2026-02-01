@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 安装脚本
rem 版本: 1.0.0
rem ============================================

set "APP_NAME=OpenChat"
set "APP_VERSION=1.0.0"
set "INSTALL_DIR=%ProgramFiles%\OpenChat"
set "SERVICE_NAME=OpenChat"

rem 颜色定义（Windows 10+ 支持）
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

echo.
echo ============================================
echo  %APP_NAME% v%APP_VERSION% 安装程序
echo ============================================
echo.

rem 检查管理员权限
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [%RED%错误%NC%] 请使用管理员权限运行安装脚本
    echo 右键点击脚本，选择"以管理员身份运行"
    pause
    exit /b 1
)

rem 检查 Node.js
echo [信息] 检查 Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [%RED%错误%NC%] 未找到 Node.js，请先安装 Node.js 16+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%a in ('node --version') do set "NODE_VERSION=%%a"
echo [%GREEN%成功%NC%] Node.js 版本: %NODE_VERSION%

rem 检查 npm
echo [信息] 检查 npm...
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [%RED%错误%NC%] 未找到 npm
    pause
    exit /b 1
)
for /f "tokens=1" %%a in ('npm --version') do set "NPM_VERSION=%%a"
echo [%GREEN%成功%NC%] npm 版本: %NPM_VERSION%

rem 创建安装目录
echo [信息] 创建安装目录: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\bin" mkdir "%INSTALL_DIR%\bin"
if not exist "%INSTALL_DIR%\etc" mkdir "%INSTALL_DIR%\etc"
if not exist "%INSTALL_DIR%\var\logs" mkdir "%INSTALL_DIR%\var\logs"
if not exist "%INSTALL_DIR%\var\run" mkdir "%INSTALL_DIR%\var\run"
if not exist "%INSTALL_DIR%\var\data" mkdir "%INSTALL_DIR%\var\data"
if not exist "%INSTALL_DIR%\scripts" mkdir "%INSTALL_DIR%\scripts"

rem 获取当前目录
set "SOURCE_DIR=%~dp0.."

echo [信息] 复制应用程序文件...
xcopy /E /I /Y "%SOURCE_DIR%\dist" "%INSTALL_DIR%\dist" >nul 2>&1
xcopy /E /I /Y "%SOURCE_DIR%\bin" "%INSTALL_DIR%\bin" >nul 2>&1
xcopy /E /I /Y "%SOURCE_DIR%\etc" "%INSTALL_DIR%\etc" >nul 2>&1
xcopy /E /I /Y "%SOURCE_DIR%\scripts" "%INSTALL_DIR%\scripts" >nul 2>&1
copy /Y "%SOURCE_DIR%\package.json" "%INSTALL_DIR%\" >nul 2>&1

rem 安装依赖
echo [信息] 安装 Node.js 依赖...
cd /d "%INSTALL_DIR%"
call npm install --production
if %ERRORLEVEL% neq 0 (
    echo [%YELLOW%警告%NC%] 依赖安装可能出现问题
)

rem 构建应用
echo [信息] 构建应用程序...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [%YELLOW%警告%NC%] 应用构建可能出现问题
)

rem 创建 Windows 服务
echo [信息] 创建 Windows 服务...

rem 使用 nssm 创建服务（如果存在）
if exist "%INSTALL_DIR%\bin\nssm.exe" (
    "%INSTALL_DIR%\bin\nssm.exe" install %SERVICE_NAME% "node.exe"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% Application "node.exe"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% AppDirectory "%INSTALL_DIR%"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% AppParameters "dist\main.js"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% DisplayName "OpenChat"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% Description "OpenChat 即时通讯服务端"
    "%INSTALL_DIR%\bin\nssm.exe" set %SERVICE_NAME% Start SERVICE_AUTO_START
    echo [%GREEN%成功%NC%] Windows 服务创建完成
) else (
    echo [%YELLOW%警告%NC%] 未找到 nssm，跳过服务创建
    echo 您可以手动使用 bin\openchat.bat 启动服务
)

rem 添加到环境变量
echo [信息] 添加到系统环境变量...
setx /M PATH "%PATH%;%INSTALL_DIR%\bin" >nul 2>&1

echo.
echo ============================================
echo  %APP_NAME% 安装完成
echo ============================================
echo.
echo 安装目录: %INSTALL_DIR%
echo.
echo 常用命令:
echo   启动服务: "%INSTALL_DIR%\bin\openchat.bat" start
echo   停止服务: "%INSTALL_DIR%\bin\openchat.bat" stop
echo   重启服务: "%INSTALL_DIR%\bin\openchat.bat" restart
echo   查看状态: "%INSTALL_DIR%\bin\openchat.bat" status
echo.
echo 配置文件: %INSTALL_DIR%\etc\config.json
echo 日志目录: %INSTALL_DIR%\var\logs
echo.
echo ============================================
echo.

echo [%GREEN%成功%NC%] 安装完成!
echo.
pause
