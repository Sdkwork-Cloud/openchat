#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

function Convert-ToCliArgs {
    param([string[]]$InputArgs)

    $output = New-Object System.Collections.Generic.List[string]
    foreach ($item in $InputArgs) {
        switch -Regex ($item) {
            '^-(Environment|env)$' { $output.Add('--environment'); continue }
            '^-(Domain|domain)$' { $output.Add('--domain'); continue }
            '^-(PublicIp|public-ip)$' { $output.Add('--public-ip'); continue }
            '^-(ServerIp|server-ip)$' { $output.Add('--server-ip'); continue }
            '^-(OpenChatPort|openchat-port)$' { $output.Add('--openchat-port'); continue }
            '^-(RuntimeEnvironment|runtime-environment)$' { $output.Add('--runtime-environment'); continue }
            '^-(Install|install)$' { $output.Add('--install'); continue }
            '^-(Reload|reload)$' { $output.Add('--reload'); continue }
            '^-(RestartOpenChat|restart-openchat)$' { $output.Add('--restart-openchat'); continue }
            '^-(StartWukongim|start-wukongim)$' { $output.Add('--start-wukongim'); continue }
            '^-(PublicTcpPort|public-tcp-port)$' { $output.Add('--public-tcp-port'); continue }
            default { $output.Add($item) }
        }
    }

    return $output.ToArray()
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$cliPath = Join-Path $projectRoot 'scripts/openchat-cli.cjs'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
    Write-Host '[ERROR] Node.js >= 18 is required to configure OpenChat edge services.' -ForegroundColor Red
    exit 1
}

$forwardedArgs = Convert-ToCliArgs -InputArgs $args
& $nodeCommand.Source $cliPath edge apply @forwardedArgs
exit $LASTEXITCODE
