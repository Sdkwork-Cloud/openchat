# OpenChat Log Management Module
# 日志管理模块

. $PSScriptRoot\config.ps1
. $PSScriptRoot\logger.ps1

function Show-OpenChatLogs {
    $stdoutLog = Join-Path $script:LogDir 'stdout.log'
    if (Test-Path $stdoutLog) {
        Write-Info "Viewing log file: $stdoutLog"
        Write-Info 'Press Ctrl+C to exit log view'
        Get-Content $stdoutLog -Wait -Tail 50
    }
    else {
        Write-Warn "Log file not found: $stdoutLog"
    }
}

function Clear-OpenChatLogs {
    Write-Info 'Cleaning log files...'
    $cutoff = (Get-Date).AddDays(-7)
    $logFiles = Get-ChildItem $script:LogDir -Filter '*.log' -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
    if ($logFiles) {
        $logFiles | Remove-Item -Force
        Write-Success "Cleaned $($logFiles.Count) old log files"
    }
    else {
        Write-Info 'No old log files to clean'
    }
}
