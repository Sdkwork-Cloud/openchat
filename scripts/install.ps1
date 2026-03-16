# ============================================
# OpenChat - Windows 一键安装脚本
# 版本: 2.0.0
# ============================================

param(
    [Parameter(Position=0)]
    [ValidateSet("install", "start", "stop", "restart", "status", "logs", "clean", "update", "uninstall", "help")]
    [string]$Action = "install",

    [Parameter(Position=1)]
    [string]$Environment = "development",

    [switch]$Force,
    [switch]$Verbose,
    [switch]$Help
)

# 配置
$Script:AppVersion = "2.0.0"
$Script:AppName = "OpenChat"
$Script:InstallDir = "$env:ProgramFiles\OpenChat"
$Script:ServiceName = "OpenChat"

# 颜色函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $colors = @{
        "Info"    = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error"   = "Red"
        "Step"    = "Blue"
    }
    
    $prefix = @{
        "Info"    = "[INFO]"
        "Success" = "[SUCCESS]"
        "Warning" = "[WARN]"
        "Error"   = "[ERROR]"
        "Step"    = "[STEP]"
    }
    
    $color = $colors[$Type]
    $pre = $prefix[$Type]
    
    Write-Host "$pre " -ForegroundColor $color -NoNewline
    Write-Host $Message
}

# 显示横幅
function Show-Banner {
    Clear-Host
    
    $banner = @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ██████╗ ███████╗ █████╗ ████████╗ █████╗ ██╗       ║
║  ██╔═══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║       ║
║  ██║   ██║██████╔╝█████╗  ███████║   ██║   ███████║██║       ║
║  ██║   ██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══██║██║       ║
║  ╚██████╔╝██║  ██║███████╗██║  ██║   ██║   ██║  ██║███████╗  ║
║   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝  ║
║                                                               ║
║           Open Source Instant Messaging Platform              ║
║                     Version $Script:AppVersion                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@
    
    Write-Host $banner -ForegroundColor Cyan
}

# 显示帮助
function Show-Help {
    Write-Host @"
用法: .\install.ps1 [操作] [环境] [选项]

操作:
  install     安装 OpenChat (默认)
  start       启动服务
  stop        停止服务
  restart     重启服务
  status      查看服务状态
  logs        查看日志
  clean       清理数据
  update      更新服务
  uninstall   卸载 OpenChat
  help        显示帮助

环境:
  development  开发环境 (默认)
  test         测试环境
  production   生产环境

选项:
  -Force       强制执行
  -Verbose     详细输出
  -Help        显示帮助

示例:
  .\install.ps1                    # 交互式安装
  .\install.ps1 install production # 生产环境安装
  .\install.ps1 start              # 启动服务
  .\install.ps1 logs               # 查看日志

"@
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查依赖
function Test-Dependencies {
    Write-ColorOutput "检查系统依赖..." "Step"
    
    $missing = @()
    
    # 检查 Docker
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker) {
        $version = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
        Write-ColorOutput "Docker $version" "Success"
    } else {
        Write-ColorOutput "未找到 Docker" "Warning"
        $missing += "Docker Desktop"
    }
    
    # 检查 Docker Compose
    $compose = docker compose version 2>$null
    if ($compose) {
        Write-ColorOutput "Docker Compose 已安装" "Success"
    } else {
        Write-ColorOutput "未找到 Docker Compose" "Warning"
        $missing += "Docker Compose"
    }
    
    # 检查 Node.js (可选)
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $version = (node --version)
        Write-ColorOutput "Node.js $version" "Success"
    } else {
        Write-ColorOutput "未找到 Node.js (可选)" "Info"
    }
    
    return $missing
}

# 获取服务器 IP
function Get-ServerIP {
    Write-ColorOutput "检测服务器 IP 地址..." "Info"
    
    # 尝试获取外网 IP
    try {
        $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -TimeoutSec 5 -UseBasicParsing).Content
        Write-ColorOutput "检测到外网 IP: $externalIP" "Info"
    } catch {
        # 获取内网 IP
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
        $externalIP = $ip
        Write-ColorOutput "检测到内网 IP: $externalIP" "Info"
    }
    
    $confirm = Read-Host "请确认服务器 IP [$externalIP]"
    if ($confirm) {
        return $confirm
    }
    return $externalIP
}

# 配置环境变量
function Initialize-Environment {
    param([string]$ExternalIP)
    
    Write-ColorOutput "配置环境变量..." "Info"
    
    if (Test-Path ".env") {
        Write-ColorOutput ".env 文件已存在，跳过配置" "Warning"
        return
    }
    
    # 复制环境配置模板
    if (Test-Path ".env.$Environment") {
        Copy-Item ".env.$Environment" ".env"
    } elseif (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        # 生成随机密码
        $dbPassword = [Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
        $redisPassword = [Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
        $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
        
        # 创建默认配置
        @"
# OpenChat 环境配置
# 自动生成于 $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# 服务器配置
EXTERNAL_IP=$ExternalIP
PORT=3000

# 数据库配置
DB_USERNAME=openchat
DB_PASSWORD=$dbPassword
DB_NAME=openchat
DB_PORT=5432

# Redis 配置
REDIS_PASSWORD=$redisPassword
REDIS_PORT=6379

# JWT 密钥
JWT_SECRET=$jwtSecret

# 悟空IM 配置
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://${ExternalIP}:5200
"@ | Out-File -FilePath ".env" -Encoding UTF8
    }
    
    # 更新 EXTERNAL_IP
    (Get-Content ".env") -replace 'EXTERNAL_IP=.*', "EXTERNAL_IP=$ExternalIP" | Set-Content ".env"
    
    Write-ColorOutput "环境变量配置完成" "Success"
    Write-ColorOutput "请编辑 .env 文件修改默认密码" "Warning"
}

# 创建目录
function New-Directories {
    Write-ColorOutput "创建目录结构..." "Info"
    
    $dirs = @(
        "var\logs",
        "var\data",
        "var\run",
        "backups"
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-ColorOutput "目录结构创建完成" "Success"
}

# 拉取镜像
function Pull-DockerImages {
    Write-ColorOutput "拉取 Docker 镜像..." "Info"
    Write-ColorOutput "这可能需要几分钟，请耐心等待..." "Info"
    
    docker compose pull
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "镜像拉取失败" "Error"
        return $false
    }
    
    Write-ColorOutput "镜像拉取完成" "Success"
    return $true
}

# 启动服务
function Start-Services {
    Write-ColorOutput "启动服务..." "Info"
    
    # 选择 compose 文件
    $composeFile = if ($Environment -eq "production") {
        "docker-compose.prod.yml"
    } else {
        "docker-compose.yml"
    }
    
    if (Test-Path $composeFile) {
        docker compose -f $composeFile up -d
    } else {
        docker compose up -d
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "服务启动失败" "Error"
        return $false
    }
    
    Write-ColorOutput "服务启动完成" "Success"
    return $true
}

# 等待服务就绪
function Wait-ServicesReady {
    Write-ColorOutput "等待服务就绪..." "Info"
    
    $maxAttempts = 60
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "OpenChat 服务已就绪" "Success"
                return $true
            }
        } catch {
            Write-Host "." -NoNewline
        }
        
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-ColorOutput "服务启动超时，请检查日志" "Error"
    return $false
}

# 显示访问信息
function Show-AccessInfo {
    param([string]$ExternalIP)
    
    $envContent = Get-Content ".env" -ErrorAction SilentlyContinue
    $ip = ($envContent | Where-Object { $_ -match "^EXTERNAL_IP=" }) -replace "EXTERNAL_IP=", ""
    if (-not $ip) { $ip = $ExternalIP }
    
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    🎉 安装成功！                              ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "服务访问地址:" -ForegroundColor White
    Write-Host "  • OpenChat API:    http://${ip}:3000"
    Write-Host "  • API 文档:        http://${ip}:3000/api/docs"
    Write-Host "  • 健康检查:        http://${ip}:3000/health"
    Write-Host "  • 悟空IM Demo:     http://${ip}:5172"
    Write-Host "  • 悟空IM 管理后台: http://${ip}:5300/web"
    Write-Host ""
    Write-Host "常用命令:" -ForegroundColor White
    Write-Host "  • 查看日志:    docker compose logs -f"
    Write-Host "  • 停止服务:    docker compose down"
    Write-Host "  • 重启服务:    docker compose restart"
    Write-Host "  • 查看状态:    docker compose ps"
    Write-Host ""
    Write-Host "安全提示:" -ForegroundColor Yellow
    Write-Host "  ⚠️  生产环境请修改 .env 文件中的默认密码"
    Write-Host "  ⚠️  建议配置防火墙，限制数据库端口仅内网访问"
    Write-Host "  ⚠️  建议启用 HTTPS"
    Write-Host ""
    Write-Host "文档: https://github.com/Sdkwork-Cloud/openchat" -ForegroundColor Cyan
    Write-Host ""
}

# 查看服务状态
function Get-ServiceStatus {
    Write-ColorOutput "服务状态:" "Info"
    docker compose ps
    
    Write-Host ""
    Write-ColorOutput "资源使用:" "Info"
    docker stats --no-stream
}

# 查看日志
function Get-ServiceLogs {
    param([string]$Service = "")
    
    if ($Service) {
        docker compose logs -f $Service
    } else {
        docker compose logs -f
    }
}

# 停止服务
function Stop-Services {
    Write-ColorOutput "停止服务..." "Info"
    docker compose down
    Write-ColorOutput "服务已停止" "Success"
}

# 清理数据
function Clear-ServiceData {
    if (-not $Force) {
        $confirm = Read-Host "确认清理所有数据? 此操作不可恢复! (yes/no)"
        if ($confirm -ne "yes") {
            Write-ColorOutput "已取消" "Info"
            return
        }
    }
    
    Write-ColorOutput "清理数据..." "Info"
    docker compose down -v
    
    Remove-Item -Path "var\logs\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "var\data\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-ColorOutput "数据已清理" "Success"
}

# 更新服务
function Update-Services {
    Write-ColorOutput "更新服务..." "Info"
    
    # 拉取最新镜像
    docker compose pull
    
    # 重新构建
    docker compose build
    
    # 重启服务
    docker compose down
    docker compose up -d
    
    Wait-ServicesReady
    
    Write-ColorOutput "更新完成" "Success"
}

# 卸载
function Uninstall-OpenChat {
    if (-not $Force) {
        $confirm = Read-Host "确认卸载 OpenChat? 此操作不可恢复! (yes/no)"
        if ($confirm -ne "yes") {
            Write-ColorOutput "已取消" "Info"
            return
        }
    }
    
    Write-ColorOutput "卸载 OpenChat..." "Info"
    
    # 停止服务
    docker compose down -v
    
    # 删除数据
    $delData = Read-Host "是否删除数据目录? (yes/no)"
    if ($delData -eq "yes") {
        Remove-Item -Path $Script:InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-ColorOutput "卸载完成" "Success"
}

# 主函数
function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    Show-Banner
    
    # 检查管理员权限
    if (-not (Test-Administrator)) {
        Write-ColorOutput "建议使用管理员权限运行安装脚本" "Warning"
    }
    
    switch ($Action) {
        "install" {
            # 检查依赖
            $missing = Test-Dependencies
            if ($missing.Count -gt 0) {
                Write-ColorOutput "缺少以下依赖: $($missing -join ', ')" "Error"
                Write-ColorOutput "请安装缺少的依赖后重试" "Info"
                return
            }
            
            # 获取 IP
            $ip = Get-ServerIP
            
            # 配置环境
            Initialize-Environment -ExternalIP $ip
            
            # 创建目录
            New-Directories
            
            # 拉取镜像
            if (-not (Pull-DockerImages)) { return }
            
            # 启动服务
            if (-not (Start-Services)) { return }
            
            # 等待就绪
            Wait-ServicesReady
            
            # 显示信息
            Show-AccessInfo -ExternalIP $ip
        }
        
        "start" {
            Start-Services
            Wait-ServicesReady
        }
        
        "stop" {
            Stop-Services
        }
        
        "restart" {
            Stop-Services
            Start-Sleep -Seconds 2
            Start-Services
            Wait-ServicesReady
        }
        
        "status" {
            Get-ServiceStatus
        }
        
        "logs" {
            Get-ServiceLogs
        }
        
        "clean" {
            Clear-ServiceData
        }
        
        "update" {
            Update-Services
        }
        
        "uninstall" {
            Uninstall-OpenChat
        }
        
        "help" {
            Show-Help
        }
    }
}

# 执行主函数
Main
