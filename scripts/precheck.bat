@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ============================================
rem OpenChat - Windows 安装前检查脚本
rem ============================================

rem 颜色代码
for /f %%i in ('echo prompt $E^| cmd') do set "ESC=%%i"
set "RED=!ESC![91m"
set "GREEN=!ESC![92m"
set "YELLOW=!ESC![93m"
set "BLUE=!ESC![94m"
set "CYAN=!ESC![96m"
set "RESET=!ESC![0m"

set PASS=0
set WARN=0
set FAIL=0

echo.
echo !CYAN!╔═══════════════════════════════════════════════════════════════╗!RESET!
echo !CYAN!║              OpenChat 安装前检查                              ║!RESET!
echo !CYAN!╚═══════════════════════════════════════════════════════════════╝!RESET!
echo.

rem ============================================
rem 操作系统检查
rem ============================================
echo !BLUE!=========================================!RESET!
echo !BLUE!操作系统检查!RESET!
echo !BLUE!=========================================!RESET!
echo.

rem Windows 版本
for /f "tokens=4-5 delims=. " %%i in ('ver') do set WIN_VER=%%i.%%j
echo !GREEN!✓!RESET! Windows 版本 [!WIN_VER!]
set /a PASS+=1

rem 系统架构
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo !GREEN!✓!RESET! 系统架构 [64位]
    set /a PASS+=1
) else if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    echo !GREEN!✓!RESET! 系统架构 [ARM64]
    set /a PASS+=1
) else (
    echo !YELLOW!!RESET! 系统架构 [!PROCESSOR_ARCHITECTURE!]
    set /a WARN+=1
)

rem 内存检查
for /f "skip=1 tokens=2" %%i in ('wmic OS TotalVisibleMemorySize /value 2^>nul') do set MEM=%%i
set /a MEM_GB=!MEM!/1024/1024
if !MEM_GB! geq 4 (
    echo !GREEN!✓!RESET! 内存大小 [!MEM_GB!GB]
    set /a PASS+=1
) else if !MEM_GB! geq 2 (
    echo !YELLOW!!RESET! 内存大小 [!MEM_GB!GB] (建议 4GB+)
    set /a WARN+=1
) else (
    echo !RED!✗!RESET! 内存大小 [!MEM_GB!GB] (不足)
    set /a FAIL+=1
)

rem 磁盘空间
for /f "tokens=3" %%i in ('dir /-C %~dp0 2^>nul ^| findstr /C:"字节可用"') do set DISK=%%i
set /a DISK_GB=!DISK:/=!/1024/1024/1024
if !DISK_GB! geq 20 (
    echo !GREEN!✓!RESET! 磁盘空间 [!DISK_GB!GB 可用]
    set /a PASS+=1
) else if !DISK_GB! geq 10 (
    echo !YELLOW!!RESET! 磁盘空间 [!DISK_GB!GB 可用] (建议 20GB+)
    set /a WARN+=1
) else (
    echo !RED!✗!RESET! 磁盘空间 [!DISK_GB!GB 可用] (不足)
    set /a FAIL+=1
)

echo.

rem ============================================
rem 依赖检查
rem ============================================
echo !BLUE!=========================================!RESET!
echo !BLUE!依赖检查!RESET!
echo !BLUE!=========================================!RESET!
echo.

rem Docker
docker --version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=3" %%i in ('docker --version 2^>nul') do set DOCKER_VER=%%i
    echo !GREEN!✓!RESET! Docker [!DOCKER_VER!]
    set /a PASS+=1
    
    docker info >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo !GREEN!✓!RESET! Docker 服务 [运行中]
        set /a PASS+=1
    ) else (
        echo !RED!✗!RESET! Docker 服务 [未运行]
        set /a FAIL+=1
    )
) else (
    echo !RED!✗!RESET! Docker [未安装]
    set /a FAIL+=1
)

rem Docker Compose
docker compose version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=4" %%i in ('docker compose version 2^>nul') do set COMPOSE_VER=%%i
    echo !GREEN!✓!RESET! Docker Compose [!COMPOSE_VER!]
    set /a PASS+=1
) else (
    echo !RED!✗!RESET! Docker Compose [未安装]
    set /a FAIL+=1
)

rem Git
git --version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    for /f "tokens=3" %%i in ('git --version 2^>nul') do set GIT_VER=%%i
    echo !GREEN!✓!RESET! Git [!GIT_VER!]
    set /a PASS+=1
) else (
    echo !YELLOW!!RESET! Git [未安装 (可选)]
    set /a WARN+=1
)

rem curl
curl --version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo !GREEN!✓!RESET! curl [已安装]
    set /a PASS+=1
) else (
    echo !YELLOW!!RESET! curl [未安装]
    set /a WARN+=1
)

echo.

rem ============================================
rem 端口检查
rem ============================================
echo !BLUE!=========================================!RESET!
echo !BLUE!端口检查!RESET!
echo !BLUE!=========================================!RESET!
echo.

set PORT_CONFLICT=0
for %%p in (3000 5432 6379 5001 5100 5200 5300) do (
    netstat -ano | findstr ":%%p " >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo !YELLOW!!RESET! 端口 %%p [已被占用]
        set /a WARN+=1
        set /a PORT_CONFLICT+=1
    ) else (
        echo !GREEN!✓!RESET! 端口 %%p [可用]
        set /a PASS+=1
    )
)

if !PORT_CONFLICT! gtr 0 (
    echo.
    echo !YELLOW!提示: 端口冲突可通过修改 .env 文件解决!RESET!
)

echo.

rem ============================================
rem 检查结果总结
rem ============================================
echo !BLUE!=========================================!RESET!
echo !BLUE!检查结果总结!RESET!
echo !BLUE!=========================================!RESET!
echo.
echo 通过: !GREEN!!PASS!!RESET!  警告: !YELLOW!!WARN!!RESET!  失败: !RED!!FAIL!!RESET!
echo.

if !FAIL! gtr 0 (
    echo !RED!存在必须解决的问题，请先修复后再安装!RESET!
    echo.
    echo 常见问题解决方法:
    echo   • 安装 Docker Desktop: https://www.docker.com/products/docker-desktop
    echo   • 启动 Docker Desktop: 在开始菜单搜索 Docker Desktop
    pause
    exit /b 1
) else if !WARN! gtr 0 (
    echo !YELLOW!存在警告项，建议处理后再安装!RESET!
    echo.
    set /p CONTINUE="是否继续安装? (y/N): "
    if /i not "!CONTINUE!"=="y" exit /b 1
) else (
    echo !GREEN!所有检查通过，可以开始安装!RESET!
)

echo.
pause
