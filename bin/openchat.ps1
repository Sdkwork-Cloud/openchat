#!/usr/bin/env pwsh
# OpenChat - Cross-Platform Startup Script
# Version: 1.1.0
# Supports: Windows PowerShell 5.1+ / PowerShell 7+ / PowerShell on Linux/macOS
#
# Features:
# - Cross-platform path handling (Windows/Linux/macOS)
# - Automatic port detection and increment
# - Service lifecycle management
# - Health checks
# - Log management

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'console', 'health', 'logs', 'clean', 'help', '')]
    [string]$Command = '',

    [Parameter()]
    [string]$Environment = $env:NODE_ENV,

    [Parameter()]
    [int]$Port = 0,

    [Parameter()]
    [string]$BindHost = ''
)

# Error handling
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ============================================
# Platform Detection
# ============================================
$script:IsWindows = $PSVersionTable.Platform -eq 'Win32NT' -or -not $PSVersionTable.Platform
$script:IsLinux = $PSVersionTable.Platform -eq 'Unix' -and (uname) -eq 'Linux'
$script:IsMacOS = $PSVersionTable.Platform -eq 'Unix' -and (uname) -eq 'Darwin'

# ============================================
# Path Resolution (works from any directory)
# ============================================
function Get-ScriptPath {
    # Try multiple methods to get script path
    $path = $null

    # Method 1: MyInvocation (works in most cases)
    if ($MyInvocation.MyCommand.Path) {
        $path = $MyInvocation.MyCommand.Path
    }
    # Method 2: PSCommandPath (fallback)
    elseif ($PSCommandPath) {
        $path = $PSCommandPath
    }
    # Method 3: PSScriptRoot with script name
    elseif ($PSScriptRoot) {
        $scriptName = $MyInvocation.MyCommand.Name
        if ($scriptName) {
            $path = Join-Path $PSScriptRoot $scriptName
        }
    }

    return $path
}

$script:ScriptPath = Get-ScriptPath

if (-not $script:ScriptPath) {
    Write-Host "[ERROR] Cannot determine script path. Please run script with full path." -ForegroundColor Red
    exit 1
}

# Resolve to absolute path
$script:ScriptPath = Resolve-Path $script:ScriptPath | Select-Object -ExpandProperty Path
$script:BinDir = Split-Path -Parent $script:ScriptPath
$script:AppHome = Split-Path -Parent $script:BinDir

# Cross-platform path separator
$script:PathSep = if ($script:IsWindows) { '\' } else { '/' }

# ============================================
# Configuration
# ============================================
$script:AppName = 'OpenChat'
$script:AppVersion = '1.1.0'
$script:ConfigFile = Join-Path $script:AppHome "etc${PathSep}config.json"
$script:PidFile = Join-Path $script:AppHome "var${PathSep}run${PathSep}openchat.pid"
$script:LogDir = Join-Path $script:AppHome "var${PathSep}logs"
$script:DataDir = Join-Path $script:AppHome "var${PathSep}data"
$script:ErrorLog = Join-Path $script:AppHome 'error.log'
$script:MainJs = Join-Path $script:AppHome "dist${PathSep}main.js"

# Validate installation
if (-not (Test-Path $script:MainJs)) {
    Write-Host "[ERROR] Invalid OpenChat installation directory: $($script:AppHome)" -ForegroundColor Red
    Write-Host "[ERROR] Main program not found: $($script:MainJs)" -ForegroundColor Red
    Write-Host "[ERROR] Please run this script from the OpenChat installation directory." -ForegroundColor Red
    exit 1
}

# Default settings
$script:DefaultPort = if ($Port -gt 0) { $Port } else { 7200 }
$script:DefaultHost = if ($BindHost) { $BindHost } else { '0.0.0.0' }
$script:NodeEnv = if ($Environment) { $Environment } else { 'production' }

# ============================================
# Output Functions
# ============================================
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host ('=' * 60) -ForegroundColor Blue
    Write-Host " $Title" -ForegroundColor Blue
    Write-Host ('=' * 60) -ForegroundColor Blue
    Write-Host ""
}

# ============================================
# Utility Functions
# ============================================
function Test-NodeJs {
    try {
        $nodeCmd = if ($script:IsWindows) { 'node.exe' } else { 'node' }
        $nodeVersion = & $nodeCmd --version 2>$null
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

function Test-PortAvailable {
    param(
        [int]$PortNum,
        [string]$HostAddr = '0.0.0.0'
    )

    try {
        # Try to create a TCP listener
        $ipAddress = [System.Net.IPAddress]::Parse($HostAddr)
        $listener = New-Object System.Net.Sockets.TcpListener($ipAddress, $PortNum)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch [System.Net.Sockets.SocketException] {
        # Port is in use
        return $false
    }
    catch {
        # Other errors (e.g., permission denied)
        return $false
    }
}

function Find-AvailablePort {
    param(
        [int]$StartPort,
        [string]$HostAddr = '0.0.0.0',
        [int]$MaxAttempts = 100
    )

    $port = $StartPort
    $attempts = 0

    while ($attempts -lt $MaxAttempts) {
        if (Test-PortAvailable -PortNum $port -HostAddr $HostAddr) {
            if ($port -ne $StartPort) {
                Write-Warn "Port $StartPort is in use, using port $port"
            }
            return $port
        }
        $port++
        $attempts++
    }

    throw "Could not find available port after $MaxAttempts attempts starting from $StartPort"
}

function Get-ServiceProcess {
    if (Test-Path $script:PidFile) {
        try {
            $pidContent = Get-Content $script:PidFile -Raw -ErrorAction SilentlyContinue
            $pidContent = $pidContent.Trim()
            if ($pidContent -match '^\d+$') {
                $proc = Get-Process -Id ([int]$pidContent) -ErrorAction SilentlyContinue
                if ($proc -and -not $proc.HasExited) {
                    return $proc
                }
            }
        }
        catch {
            # PID file exists but process not found or invalid
        }
    }
    return $null
}

function Test-ServiceRunning {
    return $null -ne (Get-ServiceProcess)
}

function Ensure-Directories {
    $dirs = @($script:LogDir, $script:DataDir, (Split-Path -Parent $script:PidFile))
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            try {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
            }
            catch {
                Write-Err "Failed to create directory: $dir"
                Write-Err "Error: $_"
                exit 1
            }
        }
    }
}

function Test-ServiceHealth {
    param(
        [string]$HostAddr,
        [int]$PortNum
    )

    try {
        $uri = "http://$HostAddr`:$PortNum/health"
        $response = Invoke-WebRequest -Uri $uri -Method GET -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode
    }
    catch {
        return 0
    }
}

# ============================================
# Service Commands
# ============================================
function Start-OpenChatService {
    param(
        [int]$Port,
        [string]$Environment,
        [string]$HostAddr
    )

    Write-Header "Starting $script:AppName"

    if (-not (Test-NodeJs)) {
        exit 1
    }

    if (Test-ServiceRunning) {
        $proc = Get-ServiceProcess
        Write-Warn "$script:AppName service is already running (PID: $($proc.Id))"
        exit 1
    }

    Write-Info 'Starting service...'
    Ensure-Directories

    $availablePort = Find-AvailablePort -StartPort $Port -HostAddr $HostAddr

    # Save current directory
    $originalDir = Get-Location

    try {
        # Set environment variables
        $env:OPENCHAT_HOME = $script:AppHome
        $env:OPENCHAT_CONFIG = $script:ConfigFile
        $env:OPENCHAT_LOG_DIR = $script:LogDir
        $env:OPENCHAT_DATA_DIR = $script:DataDir
        $env:NODE_ENV = $Environment
        $env:PORT = $availablePort
        $env:HOST = $HostAddr

        if (Test-Path $script:ErrorLog) {
            Clear-Content $script:ErrorLog
        }

        $stdoutLog = Join-Path $script:LogDir 'stdout.log'

        # Change to app directory
        Set-Location $script:AppHome

        # Start process
        $startInfo = @{
            FilePath = 'node'
            ArgumentList = @($script:MainJs)
            WorkingDirectory = $script:AppHome
            PassThru = $true
            RedirectStandardOutput = $stdoutLog
            RedirectStandardError = $script:ErrorLog
        }

        # Use -WindowStyle only on Windows
        if ($script:IsWindows) {
            $startInfo['WindowStyle'] = 'Hidden'
        }

        $proc = Start-Process @startInfo

        $proc.Id | Set-Content $script:PidFile

        Write-Info "Waiting for service to start..."
        Start-Sleep -Seconds 3

        $runningProc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
        if ($runningProc -and -not $runningProc.HasExited) {
            Write-Success "$script:AppName service started, PID: $($proc.Id)"
            Write-Info "Log file: $stdoutLog"
            Write-Info "Error log: $($script:ErrorLog)"
            Write-Info "Access URL: http://$HostAddr`:$availablePort"

            # Show startup info
            if (Test-Path $stdoutLog) {
                $startupInfo = Get-Content $stdoutLog -Tail 20 | Select-String 'Server.*Started|OpenChat.*Started' | Select-Object -Last 1
                if ($startupInfo) {
                    Write-Success 'Service startup completed successfully'
                }
            }
        }
        else {
            throw "Process exited unexpectedly"
        }
    }
    catch {
        Write-Err "$script:AppName service failed to start"
        Write-Err "Error: $_"

        if (Test-Path $script:ErrorLog) {
            $errContent = Get-Content $script:ErrorLog -Raw -ErrorAction SilentlyContinue
            if ($errContent) {
                Write-Err "Error log content:"
                Write-Host $errContent -ForegroundColor Red
            }
        }

        if (Test-Path $script:PidFile) {
            Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
        }

        exit 1
    }
    finally {
        # Restore original directory
        Set-Location $originalDir
    }
}

function Stop-OpenChatService {
    Write-Header "Stopping $script:AppName"

    $proc = Get-ServiceProcess
    if (-not $proc) {
        Write-Warn "$script:AppName service is not running"
        if (Test-Path $script:PidFile) {
            Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
        }
        return
    }

    Write-Info "Stopping service (PID: $($proc.Id))..."

    try {
        if ($script:IsWindows) {
            $proc.CloseMainWindow() | Out-Null
            $proc.WaitForExit(5000)
        }
        else {
            # On Linux/macOS, use kill command
            $proc.Kill()
            $proc.WaitForExit(5000)
        }
    }
    catch { }

    $proc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if ($proc -and -not $proc.HasExited) {
        Write-Warn 'Service not responding, force stopping...'
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $script:PidFile) {
        Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
    }

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

    Write-Info "Installation directory: $($script:AppHome)"
    Write-Info "Platform: $(if ($script:IsWindows) { 'Windows' } elseif ($script:IsMacOS) { 'macOS' } elseif ($script:IsLinux) { 'Linux' } else { 'Unknown' })"

    $proc = Get-ServiceProcess
    if ($proc) {
        Write-Success 'Service status: Running'
        Write-Info "Process PID: $($proc.Id)"
        Write-Info "Process name: $($proc.ProcessName)"
        Write-Info "Start time: $($proc.StartTime)"
        Write-Info "Memory usage: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB"
        Write-Info "CPU time: $($proc.TotalProcessorTime)"

        try {
            $conns = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue |
                Where-Object { $_.State -eq 'Listen' }
            if ($conns) {
                Write-Info 'Listening ports:'
                $conns | Select-Object LocalAddress, LocalPort |
                    Sort-Object LocalPort |
                    Format-Table -AutoSize |
                    Out-String |
                    Write-Host
            }
        }
        catch {
            # Network info may not be available on all platforms
        }
    }
    else {
        Write-Warn 'Service status: Not running'
        if (Test-Path $script:PidFile) {
            Remove-Item $script:PidFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-OpenChatConsole {
    param(
        [int]$Port,
        [string]$HostAddr
    )

    Write-Header "Running $script:AppName in console mode"

    if (-not (Test-NodeJs)) {
        exit 1
    }

    if (Test-ServiceRunning) {
        Write-Warn "$script:AppName service is already running"
        Write-Warn "Please stop the service first: $($script:ScriptPath) stop"
        exit 1
    }

    Write-Info 'Starting in console mode (Press Ctrl+C to stop)...'
    Ensure-Directories

    $availablePort = Find-AvailablePort -StartPort $Port -HostAddr $HostAddr

    # Save current directory
    $originalDir = Get-Location

    try {
        $env:OPENCHAT_HOME = $script:AppHome
        $env:OPENCHAT_CONFIG = $script:ConfigFile
        $env:OPENCHAT_LOG_DIR = $script:LogDir
        $env:OPENCHAT_DATA_DIR = $script:DataDir
        $env:NODE_ENV = 'development'
        $env:PORT = $availablePort
        $env:HOST = $HostAddr

        if (Test-Path $script:ErrorLog) {
            Clear-Content $script:ErrorLog
        }

        Set-Location $script:AppHome
        & node $script:MainJs
    }
    finally {
        Set-Location $originalDir
    }
}

function Test-OpenChatHealth {
    param(
        [string]$HostAddr,
        [int]$PortNum
    )

    if (-not (Test-ServiceRunning)) {
        Write-Err "$script:AppName service is not running"
        exit 1
    }

    Write-Info 'Checking service health...'

    $statusCode = Test-ServiceHealth -HostAddr $HostAddr -PortNum $PortNum

    if ($statusCode -eq 200) {
        Write-Success "Health check passed (HTTP $statusCode)"
    }
    elseif ($statusCode -eq 0) {
        Write-Warn "Health check failed: Could not connect"
    }
    else {
        Write-Warn "Health check warning (HTTP $statusCode)"
    }
}

function Show-OpenChatLogs {
    $stdoutLog = Join-Path $script:LogDir 'stdout.log'
    if (Test-Path $stdoutLog) {
        Write-Info "Viewing log file: $stdoutLog"
        Write-Info 'Press Ctrl+C to exit log view'
        try {
            Get-Content $stdoutLog -Wait -Tail 50
        }
        catch {
            # User pressed Ctrl+C
        }
    }
    else {
        Write-Warn "Log file not found: $stdoutLog"
        Write-Info "The service may not have been started yet."
    }
}

function Clear-OpenChatLogs {
    Write-Info 'Cleaning log files...'

    $cutoff = (Get-Date).AddDays(-7)
    $logFiles = Get-ChildItem $script:LogDir -Filter '*.log' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff }

    if ($logFiles) {
        $count = $logFiles.Count
        $logFiles | Remove-Item -Force
        Write-Success "Cleaned $count old log files"
    }
    else {
        Write-Info 'No old log files to clean'
    }
}

function Show-OpenChatHelp {
    Write-Header "$script:AppName v$script:AppVersion"

    Write-Host "Usage: openchat.ps1 [command] [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start       Start service (background mode)"
    Write-Host "  stop        Stop service"
    Write-Host "  restart     Restart service"
    Write-Host "  status      Show service status"
    Write-Host "  console     Run in console mode (debug)"
    Write-Host "  health      Health check"
    Write-Host "  logs        View real-time logs"
    Write-Host "  clean       Clean old logs"
    Write-Host "  help        Show help"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Environment env     Runtime environment (development/production)"
    Write-Host "  -Port port           Service port (default: 7200)"
    Write-Host "  -BindHost host       Bind address (default: 0.0.0.0)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\bin\openchat.ps1 start"
    Write-Host "  .\bin\openchat.ps1 start -Port 8080"
    Write-Host "  .\bin\openchat.ps1 start -Environment development"
    Write-Host "  .\bin\openchat.ps1 stop"
    Write-Host "  .\bin\openchat.ps1 restart"
    Write-Host "  .\bin\openchat.ps1 status"
    Write-Host "  .\bin\openchat.ps1 console"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  NODE_ENV    Runtime environment"
    Write-Host "  PORT        Service port"
    Write-Host "  HOST        Bind address"
    Write-Host ""
    Write-Host "Installation:"
    Write-Host "  Directory: $($script:AppHome)"
    Write-Host "  Platform: $(if ($script:IsWindows) { 'Windows' } elseif ($script:IsMacOS) { 'macOS' } elseif ($script:IsLinux) { 'Linux' } else { 'Unknown' })"
}

# ============================================
# Main Program
# ============================================

# Handle empty command
if ([string]::IsNullOrWhiteSpace($Command)) {
    $Command = 'help'
}

# Route commands
switch ($Command) {
    'start' {
        Start-OpenChatService -Port $script:DefaultPort -Environment $script:NodeEnv -HostAddr $script:DefaultHost
    }
    'stop' {
        Stop-OpenChatService
    }
    'restart' {
        Restart-OpenChatService -Port $script:DefaultPort -Environment $script:NodeEnv -HostAddr $script:DefaultHost
    }
    'status' {
        Get-OpenChatStatus
    }
    'console' {
        Start-OpenChatConsole -Port $script:DefaultPort -HostAddr $script:DefaultHost
    }
    'health' {
        Test-OpenChatHealth -HostAddr $script:DefaultHost -PortNum $script:DefaultPort
    }
    'logs' {
        Show-OpenChatLogs
    }
    'clean' {
        Clear-OpenChatLogs
    }
    'help' {
        Show-OpenChatHelp
    }
    default {
        Write-Err "Unknown command: $Command"
        Show-OpenChatHelp
        exit 1
    }
}
