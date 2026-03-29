#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

function Convert-ToCliArgs {
    param([string[]]$InputArgs)

    $output = New-Object System.Collections.Generic.List[string]
    foreach ($item in $InputArgs) {
        switch -Regex ($item) {
            '^-(Port|port)$' { $output.Add('--port'); continue }
            '^-(Environment|env)$' { $output.Add('--environment'); continue }
            '^-(Host|BindHost|host)$' { $output.Add('--host'); continue }
            '^-(HealthHost|health-host)$' { $output.Add('--health-host'); continue }
            '^-(EnvFile|env-file)$' { $output.Add('--env-file'); continue }
            '^-(HealthTimeoutMs|health-timeout-ms)$' { $output.Add('--health-timeout-ms'); continue }
            '^-(ShutdownTimeoutMs|shutdown-timeout-ms)$' { $output.Add('--shutdown-timeout-ms'); continue }
            '^-(StrictPort|strict-port)$' { $output.Add('--strict-port'); continue }
            '^-(ForceStop|force-stop)$' { $output.Add('--force-stop'); continue }
            '^-(SkipHealthCheck|skip-health-check)$' { $output.Add('--skip-health-check'); continue }
            '^-(Follow|follow)$' { $output.Add('--follow'); continue }
            default { $output.Add($item) }
        }
    }

    return $output.ToArray()
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
$projectRoot = Split-Path -Parent $scriptDir
$cliPath = Join-Path $projectRoot 'scripts/openchat-cli.cjs'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
    Write-Host '[ERROR] Node.js >= 20.19.0 is required to run OpenChat.' -ForegroundColor Red
    exit 1
}

$forwardedArgs = Convert-ToCliArgs -InputArgs $args
& $nodeCommand.Source $cliPath @forwardedArgs
exit $LASTEXITCODE
