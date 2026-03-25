param(
  [string[]]$Languages = @("typescript"),
  [switch]$SkipFetch,
  [string]$BaseUrl,
  [Alias("Host")]
  [string]$Domain = "127.0.0.1",
  [int]$Port = 3000,
  [string]$Scheme = "http",
  [string]$SchemaUrl,
  [string]$ApiPrefix = "/admin/im/v3",
  [int]$RefreshTimeoutMs = 15000
)

$ErrorActionPreference = "Stop"

function Resolve-BooleanSetting {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $false
  }

  return $Value.Trim().ToLowerInvariant() -in @("true", "1", "yes", "on")
}

function Assert-LastExitCode {
  param([string]$Step)

  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed with exit code $LASTEXITCODE"
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $WorkspaceDir "..")).Path
$GeneratorRoot = if ($env:SDKWORK_GENERATOR_ROOT) { $env:SDKWORK_GENERATOR_ROOT } else { "D:\javasource\spring-ai-plus\spring-ai-plus-business\sdk\sdkwork-sdk-generator" }
$BaseSpec = if ($env:BASE_SPEC) { $env:BASE_SPEC } else { Join-Path $WorkspaceDir "openapi\openchat-im-admin.openapi.yaml" }
$SdkgenSpec = if ($env:SDKGEN_SPEC) { $env:SDKGEN_SPEC } else { Join-Path $WorkspaceDir "openapi\openchat-im-admin.sdkgen.yaml" }
$SdkName = if ($env:SDK_NAME) { $env:SDK_NAME } else { "sdkwork-im-admin-sdk" }
$SdkType = if ($env:SDK_TYPE) { $env:SDK_TYPE } else { "backend" }
$PackageName = if ($env:PACKAGE_NAME) { $env:PACKAGE_NAME } else { "@sdkwork/im-admin-backend-sdk" }
$ResolveVersionScript = Join-Path $GeneratorRoot "bin\resolve-sdk-version.js"

if (-not $PSBoundParameters.ContainsKey("Languages") -and $env:LANGUAGES) {
  $Languages = $env:LANGUAGES.Split(",")
}
if (-not $PSBoundParameters.ContainsKey("SkipFetch") -and (Resolve-BooleanSetting $env:SKIP_FETCH)) {
  $SkipFetch = $true
}
if (-not $PSBoundParameters.ContainsKey("BaseUrl") -and $env:BASE_URL) {
  $BaseUrl = $env:BASE_URL
}
if (-not $PSBoundParameters.ContainsKey("Domain")) {
  if ($env:DOMAIN) {
    $Domain = $env:DOMAIN
  } elseif ($env:HOST) {
    $Domain = $env:HOST
  }
}
if (-not $PSBoundParameters.ContainsKey("Port") -and $env:PORT) {
  $Port = [int]$env:PORT
}
if (-not $PSBoundParameters.ContainsKey("Scheme") -and $env:SCHEME) {
  $Scheme = $env:SCHEME
}
if (-not $PSBoundParameters.ContainsKey("SchemaUrl") -and $env:SCHEMA_URL) {
  $SchemaUrl = $env:SCHEMA_URL
}
if (-not $PSBoundParameters.ContainsKey("RefreshTimeoutMs") -and $env:OPENAPI_REFRESH_TIMEOUT_MS) {
  $RefreshTimeoutMs = [int]$env:OPENAPI_REFRESH_TIMEOUT_MS
}

$ResolvedBaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  "${Scheme}://${Domain}:$Port"
} else {
  $BaseUrl
}
$ResolvedBaseUrl = $ResolvedBaseUrl.TrimEnd("/")

$OpenApiRefreshUrl = if (-not [string]::IsNullOrWhiteSpace($SchemaUrl)) {
  $SchemaUrl
} elseif ($env:OPENAPI_REFRESH_URL) {
  $env:OPENAPI_REFRESH_URL
} else {
  "$ResolvedBaseUrl/admin/im/v3/openapi.json"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SDKWork IM Admin SDK Generator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Workspace: $WorkspaceDir" -ForegroundColor DarkCyan
Write-Host "Generator: $GeneratorRoot" -ForegroundColor DarkCyan
Write-Host "Runtime base URL: $ResolvedBaseUrl" -ForegroundColor DarkCyan
Write-Host "Schema URL: $OpenApiRefreshUrl" -ForegroundColor DarkCyan
Write-Host ""

$RuntimePid = $null
$BoundarySnapshot = $null

try {
  if (-not $SkipFetch -and -not [string]::IsNullOrWhiteSpace($OpenApiRefreshUrl)) {
    Write-Host "Ensuring runtime OpenAPI endpoints are available" -ForegroundColor Yellow
    $RuntimeJson = (& node (Join-Path $ScriptDir "ensure-openapi-runtime.mjs") `
      --repo-root $RepoRoot `
      --base-url $ResolvedBaseUrl `
      --host $Domain `
      --port $Port `
      --scheme $Scheme `
      --schema-url $OpenApiRefreshUrl `
      --timeout-ms 60000)
    Assert-LastExitCode "ensure-openapi-runtime"
    $RuntimeInfo = $RuntimeJson | ConvertFrom-Json

    if ($RuntimeInfo) {
      $OpenApiRefreshUrl = $RuntimeInfo.schemaUrl
      if ($RuntimeInfo.startedRuntime -and $RuntimeInfo.pid) {
        $RuntimePid = [int]$RuntimeInfo.pid
      }
    }
  }

  $PrepareArgs = @(
    (Join-Path $ScriptDir "prepare-openapi-source.mjs"),
    "--base",
    $BaseSpec,
    "--derived",
    $SdkgenSpec,
    "--prefer-derived"
  )

  if (-not $SkipFetch -and -not [string]::IsNullOrWhiteSpace($OpenApiRefreshUrl)) {
    $PrepareArgs += @("--refresh-url", $OpenApiRefreshUrl, "--refresh-timeout-ms", $RefreshTimeoutMs)
  }

  $PreparedInput = (& node @PrepareArgs).Trim()
  Assert-LastExitCode "prepare-openapi-source"
  Write-Host "Prepared input: $PreparedInput" -ForegroundColor Green
  Write-Host ""

  Write-Host "Resolving unified SDK version" -ForegroundColor Yellow
  $ResolvedSdkVersion = (& node $ResolveVersionScript `
    --sdk-root $WorkspaceDir `
    --sdk-name $SdkName `
    --sdk-type $SdkType `
    --package-name $PackageName).Trim()
  Assert-LastExitCode "resolve-sdk-version"
  if ([string]::IsNullOrWhiteSpace($ResolvedSdkVersion)) {
    throw "Failed to resolve SDK version"
  }
  Write-Host "Resolved SDK version: $ResolvedSdkVersion" -ForegroundColor Green
  Write-Host ""

  Write-Host "Capturing manual-owned boundary snapshot" -ForegroundColor Yellow
  $BoundarySnapshot = Join-Path ([System.IO.Path]::GetTempPath()) ("sdkwork-im-admin-sdk-boundary-" + [System.Guid]::NewGuid().ToString("N") + ".json")
  & node (Join-Path $ScriptDir "verify-sdk-boundary.mjs") `
    --snapshot-root $WorkspaceDir `
    --write-snapshot $BoundarySnapshot
  Assert-LastExitCode "verify-sdk-boundary:snapshot"

  foreach ($Language in $Languages) {
    $NormalizedLanguage = $Language.Trim()
    if ([string]::IsNullOrWhiteSpace($NormalizedLanguage)) {
      continue
    }

    $OutputDir = Join-Path $WorkspaceDir "sdkwork-im-admin-sdk-$NormalizedLanguage\generated\server-openapi"
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    Write-Host "Generating $NormalizedLanguage -> $OutputDir" -ForegroundColor Cyan
    node (Join-Path $GeneratorRoot "bin\sdkgen.js") generate `
      -i $PreparedInput `
      -o $OutputDir `
      -n $SdkName `
      -t $SdkType `
      -l $NormalizedLanguage `
      --fixed-sdk-version $ResolvedSdkVersion `
      --sdk-root $WorkspaceDir `
      --sdk-name $SdkName `
      --base-url $ResolvedBaseUrl `
      --api-prefix $ApiPrefix
    Assert-LastExitCode "sdkgen:$NormalizedLanguage"
  }

  Write-Host ""
  Write-Host "Verifying generation boundary" -ForegroundColor Yellow
  & node (Join-Path $ScriptDir "verify-sdk-boundary.mjs")
  Assert-LastExitCode "verify-sdk-boundary"

  Write-Host ""
  Write-Host "Running assemble step" -ForegroundColor Yellow
  & node (Join-Path $ScriptDir "assemble-sdk.mjs")
  Assert-LastExitCode "assemble-sdk"

  Write-Host ""
  Write-Host "Verifying manual-owned boundary snapshot" -ForegroundColor Yellow
  & node (Join-Path $ScriptDir "verify-sdk-boundary.mjs") `
    --snapshot-root $WorkspaceDir `
    --compare-snapshot $BoundarySnapshot
  Assert-LastExitCode "verify-sdk-boundary"

  if ($Languages -contains "typescript") {
    Write-Host ""
    Write-Host "Materializing TypeScript workspace packages" -ForegroundColor Yellow
    & node (Join-Path $ScriptDir "materialize-typescript-workspace.mjs")
    Assert-LastExitCode "materialize-typescript-workspace"
  }
} finally {
  if ($BoundarySnapshot -and (Test-Path $BoundarySnapshot)) {
    Remove-Item -Force $BoundarySnapshot -ErrorAction SilentlyContinue
  }
  if ($RuntimePid) {
    try {
      Stop-Process -Id $RuntimePid -Force -ErrorAction Stop
    } catch {
      # ignore cleanup failures
    }
  }
}
