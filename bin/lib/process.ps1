# OpenChat Process Management Module
# 进程管理模块

. $PSScriptRoot\config.ps1

function Get-ServiceProcess {
    if (Test-Path $script:PidFile) {
        $pidContent = Get-Content $script:PidFile -Raw
        $proc = Get-Process -Id $pidContent -ErrorAction SilentlyContinue
        if ($proc -and !$proc.HasExited) {
            return $proc
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
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
}
