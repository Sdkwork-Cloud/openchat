# OpenChat Service Control Module
# 服务控制模块

. $PSScriptRoot\config.ps1
. $PSScriptRoot\logger.ps1
. $PSScriptRoot\port.ps1
. $PSScriptRoot\process.ps1

function Test-NodeJs {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Node.js version: $nodeVersion"
            return $true
        }
    }
    catch {
        Write-Err 'Node.js not found. Please install Node.js (https://nodejs.org/)'
        return $false
    }
    return $false
}

function Start-OpenChatService {
    param(
        [int]$Port,
        [string]$Environment,
        [string]$HostAddr
    )

    Write-Header "Starting $script:AppName"

    if (!(Test-NodeJs)) { exit 1 }

    if (Test-ServiceRunning) {
        $proc = Get-ServiceProcess
        Write-Warn "$script:AppName service is already running (PID: $($proc.Id))"
        exit 1
    }

    Write-Info 'Starting service...'
    Ensure-Directories

    $availablePort = Find-AvailablePort -StartPort $Port -HostAddr $HostAddr

    $env:OPENCHAT_HOME = $script:AppHome
    $env:OPENCHAT_CONFIG = $script:ConfigFile
    $env:OPENCHAT_LOG_DIR = $script:LogDir
    $env:OPENCHAT_DATA_DIR = $script:DataDir
    $env:NODE_ENV = $Environment
    $env:PORT = $availablePort
    $env:HOST = $HostAddr

    if (Test-Path $script:ErrorLog) { Clear-Content $script:ErrorLog }

    $stdoutLog = Join-Path $script:LogDir 'stdout.log'
    $proc = Start-Process -FilePath 'node' -ArgumentList 'dist/main.js' -WorkingDirectory $script:AppHome -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutLog -RedirectStandardError $script:ErrorLog

    $proc.Id | Set-Content $script:PidFile
    Start-Sleep -Seconds 3

    $runningProc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($runningProc -and !$runningProc.HasExited) {
        Write-Success "$script:AppName service started, PID: $($proc.Id)"
        Write-Info "Log file: $stdoutLog"
        Write-Info "Error log: $($script:ErrorLog)"
        Write-Info "Access URL: http://$HostAddr`:$availablePort"
    }
    else {
        Write-Err "$script:AppName service failed to start"
        if (Test-Path $script:ErrorLog) {
            $errContent = Get-Content $script:ErrorLog -Raw
            if ($errContent) {
                Write-Err "Error info:"
                Write-Host $errContent -ForegroundColor Red
            }
        }
        Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
        exit 1
    }
}

function Stop-OpenChatService {
    Write-Header "Stopping $script:AppName"

    $proc = Get-ServiceProcess
    if (!$proc) {
        Write-Warn "$script:AppName service is not running"
        Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
        return
    }

    Write-Info "Stopping service (PID: $($proc.Id))..."

    try {
        $proc.CloseMainWindow() | Out-Null
        $proc.WaitForExit(5000)
    }
    catch { }

    $proc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($proc -and !$proc.HasExited) {
        Write-Warn 'Service not responding, force stopping...'
        Stop-Process -Id $proc.Id -Force
    }

    Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
    Write-Success "$script:AppName service stopped"
}

function Restart-OpenChatService {
    param(
        [int]$Port,
        [string]$Environment,
        [string]$HostAddr
    )

    Write-Header "Restarting $script:AppName"
    Stop-OpenChatService
    Start-Sleep -Seconds 2
    Start-OpenChatService -Port $Port -Environment $Environment -HostAddr $HostAddr
}

function Get-OpenChatStatus {
    Write-Header "$script:AppName Status"

    $proc = Get-ServiceProcess
    if ($proc) {
        Write-Success 'Service status: Running'
        Write-Info "Process PID: $($proc.Id)"
        Write-Info "Process name: $($proc.ProcessName)"
        Write-Info "Start time: $($proc.StartTime)"
        Write-Info "Memory usage: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB"

        try {
            $conns = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
            if ($conns) {
                Write-Info 'Port listening:'
                $conns | Select-Object LocalAddress, LocalPort | Format-Table -AutoSize | Out-String | Write-Host
            }
        }
        catch { }
    }
    else {
        Write-Warn 'Service status: Not running'
        Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
    }
}

function Start-OpenChatConsole {
    param(
        [int]$Port,
        [string]$HostAddr
    )

    Write-Header "Running $script:AppName in console mode"

    if (!(Test-NodeJs)) { exit 1 }

    Write-Info 'Starting in console mode (Press Ctrl+C to stop)...'
    Ensure-Directories

    $availablePort = Find-AvailablePort -StartPort $Port -HostAddr $HostAddr

    $env:OPENCHAT_HOME = $script:AppHome
    $env:OPENCHAT_CONFIG = $script:ConfigFile
    $env:OPENCHAT_LOG_DIR = $script:LogDir
    $env:OPENCHAT_DATA_DIR = $script:DataDir
    $env:NODE_ENV = 'development'
    $env:PORT = $availablePort
    $env:HOST = $HostAddr

    if (Test-Path $script:ErrorLog) { Clear-Content $script:ErrorLog }

    Set-Location $script:AppHome
    & node dist/main.js
}

function Test-OpenChatHealth {
    param(
        [string]$HostAddr,
        [int]$PortNum
    )

    if (!(Test-ServiceRunning)) {
        Write-Err "$script:AppName service is not running"
        exit 1
    }

    Write-Info 'Checking service health...'

    try {
        $resp = Invoke-WebRequest -Uri "http://$HostAddr`:$PortNum/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) {
            Write-Success "Health check passed (HTTP $($resp.StatusCode))"
        }
        else {
            Write-Warn "Health check warning (HTTP $($resp.StatusCode))"
        }
    }
    catch {
        Write-Warn "Health check failed: Could not connect"
    }
}
