#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

function Convert-ToCliArgs {
    param([string[]]$InputArgs)

    $output = New-Object System.Collections.Generic.List[string]
    foreach ($item in $InputArgs) {
        switch -Regex ($item) {
            '^-(Mode|mode)$' { $output.Add('--mode'); continue }
            '^-(Environment|env)$' { $output.Add('--environment'); continue }
            '^-(Yes|yes)$' { $output.Add('--yes'); continue }
            '^-(InitDb|init-db)$' { $output.Add('--init-db'); continue }
            '^-(Start|start)$' { $output.Add('--start'); continue }
            '^-(Seed|seed)$' { $output.Add('--seed'); continue }
            '^-(SkipBuild|skip-build)$' { $output.Add('--skip-build'); continue }
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
    Write-Host '[ERROR] Node.js >= 20.19.0 is required to run OpenChat setup wizard.' -ForegroundColor Red
    exit 1
}

$forwardedArgs = Convert-ToCliArgs -InputArgs $args
& $nodeCommand.Source $cliPath install @forwardedArgs
exit $LASTEXITCODE
