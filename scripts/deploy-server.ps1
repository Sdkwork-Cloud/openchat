#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

function Convert-ToCliArgs {
    param([string[]]$InputArgs)

    $output = New-Object System.Collections.Generic.List[string]
    foreach ($item in $InputArgs) {
        switch -Regex ($item) {
            '^-(Environment|env)$' { $output.Add('--environment'); continue }
            '^-(EnvFile|env-file)$' { $output.Add('--env-file'); continue }
            '^-(Yes|yes)$' { $output.Add('--yes'); continue }
            '^-(Seed|seed)$' { $output.Add('--seed'); continue }
            '^-(SkipBuild|skip-build)$' { $output.Add('--skip-build'); continue }
            '^-(Service|service)$' { $output.Add('--service'); continue }
            '^-(Start|start)$' { $output.Add('--start'); continue }
            '^-(DbAction|db-action)$' { $output.Add('--db-action'); continue }
            '^-(Host|host)$' { $output.Add('--host'); continue }
            '^-(Port|port)$' { $output.Add('--port'); continue }
            '^-(HealthHost|health-host)$' { $output.Add('--health-host'); continue }
            '^-(HealthTimeoutMs|health-timeout-ms)$' { $output.Add('--health-timeout-ms'); continue }
            '^-(ShutdownTimeoutMs|shutdown-timeout-ms)$' { $output.Add('--shutdown-timeout-ms'); continue }
            '^-(StrictPort|strict-port)$' { $output.Add('--strict-port'); continue }
            '^-(ForceStop|force-stop)$' { $output.Add('--force-stop'); continue }
            '^-(SkipHealthCheck|skip-health-check)$' { $output.Add('--skip-health-check'); continue }
            '^-(ServiceUser|service-user)$' { $output.Add('--service-user'); continue }
            '^-(ServiceGroup|service-group)$' { $output.Add('--service-group'); continue }
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
    Write-Host '[ERROR] Node.js >= 20.19.0 is required to run OpenChat deploy.' -ForegroundColor Red
    exit 1
}

$forwardedArgs = Convert-ToCliArgs -InputArgs $args
& $nodeCommand.Source $cliPath deploy @forwardedArgs
exit $LASTEXITCODE
