#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$cliPath = Join-Path $projectRoot 'scripts/openchat-cli.cjs'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
    Write-Host '[ERROR] Node.js >= 18 is required to run OpenChat quick-install.' -ForegroundColor Red
    exit 1
}

& $nodeCommand.Source $cliPath quick-install @args
exit $LASTEXITCODE
