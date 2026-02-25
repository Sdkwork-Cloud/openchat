# OpenChat Logger Module
# 日志输出模块

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
    Write-Host ('=' * 50) -ForegroundColor Blue
    Write-Host " $Title" -ForegroundColor Blue
    Write-Host ('=' * 50) -ForegroundColor Blue
    Write-Host ""
}
