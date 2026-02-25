# OpenChat Port Management Module
# 端口管理模块

. $PSScriptRoot\logger.ps1

function Test-PortAvailable {
    param(
        [int]$PortNum,
        [string]$HostAddr = '0.0.0.0'
    )

    try {
        $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Parse($HostAddr)), $PortNum
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
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
