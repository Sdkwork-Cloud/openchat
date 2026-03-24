# ============================================
# OpenChat - Windows 涓€閿畨瑁呰剼鏈?# 鐗堟湰: 2.0.0
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

# 閰嶇疆
$Script:AppVersion = "2.0.0"
$Script:AppName = "OpenChat"
$Script:InstallDir = "$env:ProgramFiles\OpenChat"
$Script:ServiceName = "OpenChat"

# 棰滆壊鍑芥暟
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

# 鏄剧ず妯箙
function Show-Banner {
    Clear-Host
    
    $banner = @"

鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?鈺?                                                              鈺?鈺?  鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈻堚枅鈻堚枅鈻堚枅鈺?鈻堚枅鈻堚枅鈻堚晽 鈻堚枅鈺?      鈺?鈺? 鈻堚枅鈺斺晲鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺愨晲鈺濃枅鈻堚晹鈺愨晲鈻堚枅鈺椻暁鈺愨晲鈻堚枅鈺斺晲鈺愨暆鈻堚枅鈺斺晲鈺愨枅鈻堚晽鈻堚枅鈺?      鈺?鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚枅鈻堚枅鈺? 鈻堚枅鈻堚枅鈻堚枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈻堚枅鈻堚枅鈻堚晳鈻堚枅鈺?      鈺?鈺? 鈻堚枅鈺?  鈻堚枅鈺戔枅鈻堚晹鈺愨晲鈻堚枅鈺椻枅鈻堚晹鈺愨晲鈺? 鈻堚枅鈺斺晲鈺愨枅鈻堚晳   鈻堚枅鈺?  鈻堚枅鈺斺晲鈺愨枅鈻堚晳鈻堚枅鈺?      鈺?鈺? 鈺氣枅鈻堚枅鈻堚枅鈻堚晹鈺濃枅鈻堚晳  鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺椻枅鈻堚晳  鈻堚枅鈺?  鈻堚枅鈺?  鈻堚枅鈺? 鈻堚枅鈺戔枅鈻堚枅鈻堚枅鈻堚枅鈺? 鈺?鈺?  鈺氣晲鈺愨晲鈺愨晲鈺?鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺濃暁鈺愨暆  鈺氣晲鈺?  鈺氣晲鈺?  鈺氣晲鈺? 鈺氣晲鈺濃暁鈺愨晲鈺愨晲鈺愨晲鈺? 鈺?鈺?                                                              鈺?鈺?          Open Source Instant Messaging Platform              鈺?鈺?                    Version $Script:AppVersion                           鈺?鈺?                                                              鈺?鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
"@
    
    Write-Host $banner -ForegroundColor Cyan
}

# 鏄剧ず甯姪
function Show-Help {
    Write-Host @"
鐢ㄦ硶: .\install.ps1 [鎿嶄綔] [鐜] [閫夐」]

鎿嶄綔:
  install     瀹夎 OpenChat (榛樿)
  start       鍚姩鏈嶅姟
  stop        鍋滄鏈嶅姟
  restart     閲嶅惎鏈嶅姟
  status      鏌ョ湅鏈嶅姟鐘舵€?  logs        鏌ョ湅鏃ュ織
  clean       娓呯悊鏁版嵁
  update      鏇存柊鏈嶅姟
  uninstall   鍗歌浇 OpenChat
  help        鏄剧ず甯姪

鐜:
  development  寮€鍙戠幆澧?(榛樿)
  test         娴嬭瘯鐜
  production   鐢熶骇鐜

閫夐」:
  -Force       寮哄埗鎵ц
  -Verbose     璇︾粏杈撳嚭
  -Help        鏄剧ず甯姪

绀轰緥:
  .\install.ps1                    # 浜や簰寮忓畨瑁?  .\install.ps1 install production # 鐢熶骇鐜瀹夎
  .\install.ps1 start              # 鍚姩鏈嶅姟
  .\install.ps1 logs               # 鏌ョ湅鏃ュ織

"@
}

# 妫€鏌ョ鐞嗗憳鏉冮檺
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 妫€鏌ヤ緷璧?function Test-Dependencies {
    Write-ColorOutput "妫€鏌ョ郴缁熶緷璧?.." "Step"
    
    $missing = @()
    
    # 妫€鏌?Docker
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker) {
        $version = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
        Write-ColorOutput "Docker $version" "Success"
    } else {
        Write-ColorOutput "鏈壘鍒?Docker" "Warning"
        $missing += "Docker Desktop"
    }
    
    # 妫€鏌?Docker Compose
    $compose = docker compose version 2>$null
    if ($compose) {
        Write-ColorOutput "Docker Compose 宸插畨瑁? "Success"
    } else {
        Write-ColorOutput "鏈壘鍒?Docker Compose" "Warning"
        $missing += "Docker Compose"
    }
    
    # 妫€鏌?Node.js (鍙€?
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $version = (node --version)
        Write-ColorOutput "Node.js $version" "Success"
    } else {
        Write-ColorOutput "鏈壘鍒?Node.js (鍙€?" "Info"
    }
    
    return $missing
}

# 鑾峰彇鏈嶅姟鍣?IP
function Get-ServerIP {
    Write-ColorOutput "妫€娴嬫湇鍔″櫒 IP 鍦板潃..." "Info"
    
    # 灏濊瘯鑾峰彇澶栫綉 IP
    try {
        $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -TimeoutSec 5 -UseBasicParsing).Content
        Write-ColorOutput "妫€娴嬪埌澶栫綉 IP: $externalIP" "Info"
    } catch {
        # 鑾峰彇鍐呯綉 IP
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
        $externalIP = $ip
        Write-ColorOutput "妫€娴嬪埌鍐呯綉 IP: $externalIP" "Info"
    }
    
    $confirm = Read-Host "璇风‘璁ゆ湇鍔″櫒 IP [$externalIP]"
    if ($confirm) {
        return $confirm
    }
    return $externalIP
}

# 閰嶇疆鐜鍙橀噺
function Initialize-Environment {
    param([string]$ExternalIP)
    
    Write-ColorOutput "閰嶇疆鐜鍙橀噺..." "Info"
    
    if (Test-Path ".env") {
        Write-ColorOutput ".env 鏂囦欢宸插瓨鍦紝璺宠繃閰嶇疆" "Warning"
        return
    }
    
    # 澶嶅埗鐜閰嶇疆妯℃澘
    if (Test-Path ".env.$Environment") {
        Copy-Item ".env.$Environment" ".env"
    } elseif (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    } else {
        # 鐢熸垚闅忔満瀵嗙爜
        $dbPassword = [Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
        $redisPassword = [Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
        $jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
        
        # 鍒涘缓榛樿閰嶇疆
        @"
# OpenChat 鐜閰嶇疆
# 鑷姩鐢熸垚浜?$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# 鏈嶅姟鍣ㄩ厤缃?EXTERNAL_IP=$ExternalIP
PORT=3000

# 鏁版嵁搴撻厤缃?DB_USERNAME=openchat
DB_PASSWORD=$dbPassword
DB_NAME=openchat
DB_PORT=5432

# Redis 閰嶇疆
REDIS_PASSWORD=$redisPassword
REDIS_PORT=6379

# JWT 瀵嗛挜
JWT_SECRET=$jwtSecret

# 鎮熺┖IM 閰嶇疆
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://${ExternalIP}:5200
"@ | Out-File -FilePath ".env" -Encoding UTF8
    }
    
    # 鏇存柊 EXTERNAL_IP
    (Get-Content ".env") -replace 'EXTERNAL_IP=.*', "EXTERNAL_IP=$ExternalIP" | Set-Content ".env"
    
    Write-ColorOutput "鐜鍙橀噺閰嶇疆瀹屾垚" "Success"
    Write-ColorOutput "璇风紪杈?.env 鏂囦欢淇敼榛樿瀵嗙爜" "Warning"
}

# 鍒涘缓鐩綍
function New-Directories {
    Write-ColorOutput "鍒涘缓鐩綍缁撴瀯..." "Info"
    
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
    
    Write-ColorOutput "鐩綍缁撴瀯鍒涘缓瀹屾垚" "Success"
}

# 鎷夊彇闀滃儚
function Pull-DockerImages {
    Write-ColorOutput "鎷夊彇 Docker 闀滃儚..." "Info"
    Write-ColorOutput "杩欏彲鑳介渶瑕佸嚑鍒嗛挓锛岃鑰愬績绛夊緟..." "Info"
    
    docker compose pull
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "闀滃儚鎷夊彇澶辫触" "Error"
        return $false
    }
    
    Write-ColorOutput "闀滃儚鎷夊彇瀹屾垚" "Success"
    return $true
}

# 鍚姩鏈嶅姟
function Start-Services {
    Write-ColorOutput "鍚姩鏈嶅姟..." "Info"
    
    # 閫夋嫨 compose 鏂囦欢
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
        Write-ColorOutput "鏈嶅姟鍚姩澶辫触" "Error"
        return $false
    }
    
    Write-ColorOutput "鏈嶅姟鍚姩瀹屾垚" "Success"
    return $true
}

# 绛夊緟鏈嶅姟灏辩华
function Wait-ServicesReady {
    Write-ColorOutput "绛夊緟鏈嶅姟灏辩华..." "Info"
    
    $maxAttempts = 60
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "OpenChat 鏈嶅姟宸插氨缁? "Success"
                return $true
            }
        } catch {
            Write-Host "." -NoNewline
        }
        
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-ColorOutput "鏈嶅姟鍚姩瓒呮椂锛岃妫€鏌ユ棩蹇? "Error"
    return $false
}

# 鏄剧ず璁块棶淇℃伅
function Show-AccessInfo {
    param([string]$ExternalIP)
    
    $envContent = Get-Content ".env" -ErrorAction SilentlyContinue
    $ip = ($envContent | Where-Object { $_ -match "^EXTERNAL_IP=" }) -replace "EXTERNAL_IP=", ""
    if (-not $ip) { $ip = $ExternalIP }
    
    Write-Host ""
    Write-Host "鈺斺晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺? -ForegroundColor Green
    Write-Host "鈺?                   馃帀 瀹夎鎴愬姛锛?                             鈺? -ForegroundColor Green
    Write-Host "鈺氣晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺? -ForegroundColor Green
    Write-Host ""
    Write-Host "鏈嶅姟璁块棶鍦板潃:" -ForegroundColor White
    Write-Host "  鈥?OpenChat API:    http://${ip}:3000"
    Write-Host "  鈥?API 鏂囨。:        http://${ip}:3000/im/v3/docs"
    Write-Host "  鈥?鍋ュ悍妫€鏌?        http://${ip}:3000/health"
    Write-Host "  鈥?鎮熺┖IM Demo:     http://${ip}:5172"
    Write-Host "  鈥?鎮熺┖IM 绠＄悊鍚庡彴: http://${ip}:5300/web"
    Write-Host ""
    Write-Host "甯哥敤鍛戒护:" -ForegroundColor White
    Write-Host "  鈥?鏌ョ湅鏃ュ織:    docker compose logs -f"
    Write-Host "  鈥?鍋滄鏈嶅姟:    docker compose down"
    Write-Host "  鈥?閲嶅惎鏈嶅姟:    docker compose restart"
    Write-Host "  鈥?鏌ョ湅鐘舵€?    docker compose ps"
    Write-Host ""
    Write-Host "瀹夊叏鎻愮ず:" -ForegroundColor Yellow
    Write-Host "  鈿狅笍  鐢熶骇鐜璇蜂慨鏀?.env 鏂囦欢涓殑榛樿瀵嗙爜"
    Write-Host "  鈿狅笍  寤鸿閰嶇疆闃茬伀澧欙紝闄愬埗鏁版嵁搴撶鍙ｄ粎鍐呯綉璁块棶"
    Write-Host "  鈿狅笍  寤鸿鍚敤 HTTPS"
    Write-Host ""
    Write-Host "鏂囨。: https://github.com/Sdkwork-Cloud/openchat" -ForegroundColor Cyan
    Write-Host ""
}

# 鏌ョ湅鏈嶅姟鐘舵€?function Get-ServiceStatus {
    Write-ColorOutput "鏈嶅姟鐘舵€?" "Info"
    docker compose ps
    
    Write-Host ""
    Write-ColorOutput "璧勬簮浣跨敤:" "Info"
    docker stats --no-stream
}

# 鏌ョ湅鏃ュ織
function Get-ServiceLogs {
    param([string]$Service = "")
    
    if ($Service) {
        docker compose logs -f $Service
    } else {
        docker compose logs -f
    }
}

# 鍋滄鏈嶅姟
function Stop-Services {
    Write-ColorOutput "鍋滄鏈嶅姟..." "Info"
    docker compose down
    Write-ColorOutput "鏈嶅姟宸插仠姝? "Success"
}

# 娓呯悊鏁版嵁
function Clear-ServiceData {
    if (-not $Force) {
        $confirm = Read-Host "纭娓呯悊鎵€鏈夋暟鎹? 姝ゆ搷浣滀笉鍙仮澶? (yes/no)"
        if ($confirm -ne "yes") {
            Write-ColorOutput "宸插彇娑? "Info"
            return
        }
    }
    
    Write-ColorOutput "娓呯悊鏁版嵁..." "Info"
    docker compose down -v
    
    Remove-Item -Path "var\logs\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "var\data\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-ColorOutput "鏁版嵁宸叉竻鐞? "Success"
}

# 鏇存柊鏈嶅姟
function Update-Services {
    Write-ColorOutput "鏇存柊鏈嶅姟..." "Info"
    
    # 鎷夊彇鏈€鏂伴暅鍍?    docker compose pull
    
    # 閲嶆柊鏋勫缓
    docker compose build
    
    # 閲嶅惎鏈嶅姟
    docker compose down
    docker compose up -d
    
    Wait-ServicesReady
    
    Write-ColorOutput "鏇存柊瀹屾垚" "Success"
}

# 鍗歌浇
function Uninstall-OpenChat {
    if (-not $Force) {
        $confirm = Read-Host "纭鍗歌浇 OpenChat? 姝ゆ搷浣滀笉鍙仮澶? (yes/no)"
        if ($confirm -ne "yes") {
            Write-ColorOutput "宸插彇娑? "Info"
            return
        }
    }
    
    Write-ColorOutput "鍗歌浇 OpenChat..." "Info"
    
    # 鍋滄鏈嶅姟
    docker compose down -v
    
    # 鍒犻櫎鏁版嵁
    $delData = Read-Host "鏄惁鍒犻櫎鏁版嵁鐩綍? (yes/no)"
    if ($delData -eq "yes") {
        Remove-Item -Path $Script:InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-ColorOutput "鍗歌浇瀹屾垚" "Success"
}

# 涓诲嚱鏁?function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    Show-Banner
    
    # 妫€鏌ョ鐞嗗憳鏉冮檺
    if (-not (Test-Administrator)) {
        Write-ColorOutput "寤鸿浣跨敤绠＄悊鍛樻潈闄愯繍琛屽畨瑁呰剼鏈? "Warning"
    }
    
    switch ($Action) {
        "install" {
            # 妫€鏌ヤ緷璧?            $missing = Test-Dependencies
            if ($missing.Count -gt 0) {
                Write-ColorOutput "缂哄皯浠ヤ笅渚濊禆: $($missing -join ', ')" "Error"
                Write-ColorOutput "璇峰畨瑁呯己灏戠殑渚濊禆鍚庨噸璇? "Info"
                return
            }
            
            # 鑾峰彇 IP
            $ip = Get-ServerIP
            
            # 閰嶇疆鐜
            Initialize-Environment -ExternalIP $ip
            
            # 鍒涘缓鐩綍
            New-Directories
            
            # 鎷夊彇闀滃儚
            if (-not (Pull-DockerImages)) { return }
            
            # 鍚姩鏈嶅姟
            if (-not (Start-Services)) { return }
            
            # 绛夊緟灏辩华
            Wait-ServicesReady
            
            # 鏄剧ず淇℃伅
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

# 鎵ц涓诲嚱鏁?Main

