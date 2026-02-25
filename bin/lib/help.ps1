# OpenChat Help Module
# 帮助信息模块

. $PSScriptRoot\config.ps1
. $PSScriptRoot\logger.ps1

function Show-OpenChatHelp {
    Write-Header "$script:AppName v$script:AppVersion"

    Write-Host 'Usage: openchat.ps1 [command] [options]'
    Write-Host ''
    Write-Host 'Commands:'
    Write-Host '  start       Start service (background mode)'
    Write-Host '  stop        Stop service'
    Write-Host '  restart     Restart service'
    Write-Host '  status      Show service status'
    Write-Host '  console     Run in console mode (debug)'
    Write-Host '  health      Health check'
    Write-Host '  logs        View real-time logs'
    Write-Host '  clean       Clean old logs'
    Write-Host '  help        Show help'
    Write-Host ''
    Write-Host 'Options:'
    Write-Host '  -Environment env     Runtime environment (development/production)'
    Write-Host '  -Port port           Service port (default: 7200)'
    Write-Host '  -BindHost host       Bind address (default: 0.0.0.0)'
    Write-Host ''
    Write-Host 'Examples:'
    Write-Host '  .\bin\openchat.ps1 start'
    Write-Host '  .\bin\openchat.ps1 start -Port 8080'
    Write-Host '  .\bin\openchat.ps1 start -Environment development'
    Write-Host '  .\bin\openchat.ps1 stop'
    Write-Host '  .\bin\openchat.ps1 restart'
    Write-Host '  .\bin\openchat.ps1 status'
    Write-Host '  .\bin\openchat.ps1 console'
    Write-Host ''
    Write-Host 'Environment Variables:'
    Write-Host '  NODE_ENV    Runtime environment'
    Write-Host '  PORT        Service port'
    Write-Host '  HOST        Bind address'
}
